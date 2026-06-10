import argparse
import json
import os
import time
from pathlib import Path
from urllib import error, request

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
    payload_key = payload.get("measuredAt")
    if payload_key:
        for queued_payload in read_queue():
            if queued_payload.get("measuredAt") == payload_key:
                return

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


def sync_queue_to_backend(backend_url: str, device_id: str) -> tuple[int, int]:
    queued = read_queue()
    if not queued:
        return 0, 0

    sync_url = f"{backend_url.rstrip('/')}/api/v1/devices/{device_id}/sensors/sync"
    body = json.dumps(queued, ensure_ascii=False).encode("utf-8")
    sync_request = request.Request(
        sync_url,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with request.urlopen(sync_request, timeout=8) as response:
            response_body = response.read().decode("utf-8")
            result = json.loads(response_body) if response_body else {}
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Backend sync failed: {exc}") from exc

    if not result.get("success"):
        raise RuntimeError(f"Backend sync returned failure: {result}")

    write_queue([])
    return int(result.get("saved", 0)), int(result.get("skipped", 0))


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
    parser.add_argument("--backend-url", default=os.getenv("SMARTFARM_BACKEND_URL"))
    parser.add_argument("--hardware", action="store_true", help="Read real DHT/soil sensors instead of mock values.")
    args = parser.parse_args()
    backend_url = args.backend_url or f"http://{args.broker_host}:8080"

    topic = f"smartfarm/{args.device_id}/sensor"
    reader = SensorReader(mock=not args.hardware)
    client = create_client(args.device_id)

    print(f"Publishing sensor data to {args.broker_host}:{args.broker_port}")
    print(f"Topic: {topic}")
    print(f"Interval: {max(60, args.interval)}s")
    print(f"Mode: {'hardware' if args.hardware else 'mock'}")
    print(f"Offline queue: {QUEUE_PATH}")
    print(f"Backend sync: {backend_url}")

    try:
        while True:
            payload = build_sensor_payload(args.device_id, reader)
            append_to_queue(payload)

            if connect_client(client, args.broker_host, args.broker_port):
                try:
                    publish_payload(client, topic, payload)
                    print(json.dumps(payload, ensure_ascii=False))
                except Exception as exc:
                    client.disconnect()
                    print(f"MQTT publish failed. payload remains in local queue. error={exc}")
            else:
                print(json.dumps({"queued": True, **payload}, ensure_ascii=False))

            try:
                saved_count, skipped_count = sync_queue_to_backend(backend_url, args.device_id)
                if saved_count or skipped_count:
                    print(f"Backend sync completed. saved={saved_count}, skipped={skipped_count}")
            except Exception as exc:
                print(f"Backend sync unavailable. queue retained. error={exc}")

            time.sleep(max(60, args.interval))
    finally:
        if client.is_connected():
            client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
