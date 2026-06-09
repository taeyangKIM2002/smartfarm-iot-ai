import argparse
import json
import os
import time
from pathlib import Path

import paho.mqtt.client as mqtt

from BasilEmotionEngine import BasilEmotionEngine
from sensor_reader import SensorReader


QUEUE_PATH = Path(os.getenv("SMARTFARM_SENSOR_QUEUE", "/home/pi/smartfarm_sensor_queue.jsonl"))


def create_client(device_id: str) -> mqtt.Client:
    try:
        return mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"smartfarm-sensor-{device_id}")
    except AttributeError:
        return mqtt.Client(client_id=f"smartfarm-sensor-{device_id}")


def build_sensor_payload(device_id: str, reader: SensorReader) -> dict:
    reading = reader.read()
    return BasilEmotionEngine().build_payload(
        device_id=device_id,
        temperature=reading.temperature,
        humidity=reading.humidity,
        soil_moisture=reading.soil_moisture,
        soil_raw=reading.soil_raw,
        illuminance=reading.illuminance,
    )


def append_to_queue(payload: dict) -> None:
    QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with QUEUE_PATH.open("a", encoding="utf-8") as file:
        file.write(json.dumps(payload, ensure_ascii=False) + "\n")


def read_queue() -> list[dict]:
    if not QUEUE_PATH.exists():
        return []

    queued: list[dict] = []
    with QUEUE_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line:
                continue
            try:
                queued.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return queued


def write_queue(payloads: list[dict]) -> None:
    if not payloads:
        QUEUE_PATH.unlink(missing_ok=True)
        return

    QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with QUEUE_PATH.open("w", encoding="utf-8") as file:
        for payload in payloads:
            file.write(json.dumps(payload, ensure_ascii=False) + "\n")


def publish_payload(client: mqtt.Client, topic: str, payload: dict) -> None:
    message = client.publish(topic, json.dumps(payload), qos=1)
    message.wait_for_publish(timeout=5)
    if not message.is_published():
        raise RuntimeError("MQTT publish was not acknowledged")


def drain_queue(client: mqtt.Client, topic: str) -> int:
    queued = read_queue()
    if not queued:
        return 0

    remaining: list[dict] = []
    sent_count = 0
    for payload in queued:
        if remaining:
            remaining.append(payload)
            continue
        try:
            publish_payload(client, topic, payload)
            sent_count += 1
        except Exception:
            remaining.append(payload)

    write_queue(remaining)
    return sent_count


def connect_client(client: mqtt.Client, broker_host: str, broker_port: int) -> bool:
    if client.is_connected():
        return True
    try:
        client.connect(broker_host, broker_port, keepalive=60)
        client.loop_start()
        return True
    except Exception as exc:
        print(f"MQTT connection unavailable. buffering locally. error={exc}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish SmartFarm sensor values to the Spring MQTT broker.")
    parser.add_argument("--broker-host", default=os.getenv("SMARTFARM_MQTT_HOST", "192.168.137.1"))
    parser.add_argument("--broker-port", type=int, default=int(os.getenv("SMARTFARM_MQTT_PORT", "1883")))
    parser.add_argument("--device-id", default=os.getenv("SMARTFARM_DEVICE_ID", "RASP_001"))
    parser.add_argument("--interval", type=int, default=int(os.getenv("SMARTFARM_SENSOR_INTERVAL", "60")))
    parser.add_argument("--hardware", action="store_true", help="Read real DHT/soil sensors instead of mock values.")
    args = parser.parse_args()

    topic = f"smartfarm/{args.device_id}/sensor"
    reader = SensorReader(mock=not args.hardware)
    client = create_client(args.device_id)

    print(f"Publishing sensor data to {args.broker_host}:{args.broker_port}")
    print(f"Topic: {topic}")
    print(f"Interval: {max(60, args.interval)}s")
    print(f"Mode: {'hardware' if args.hardware else 'mock'}")
    print(f"Offline queue: {QUEUE_PATH}")

    try:
        while True:
            payload = build_sensor_payload(args.device_id, reader)
            if connect_client(client, args.broker_host, args.broker_port):
                try:
                    sent_count = drain_queue(client, topic)
                    publish_payload(client, topic, payload)
                    if sent_count:
                        print(f"Synced queued sensor payloads: {sent_count}")
                    print(json.dumps(payload, ensure_ascii=False))
                except Exception as exc:
                    append_to_queue(payload)
                    client.disconnect()
                    print(f"MQTT publish failed. saved to local queue. error={exc}")
            else:
                append_to_queue(payload)
                print(json.dumps({"queued": True, **payload}, ensure_ascii=False))
            time.sleep(max(60, args.interval))
    finally:
        if client.is_connected():
            client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
