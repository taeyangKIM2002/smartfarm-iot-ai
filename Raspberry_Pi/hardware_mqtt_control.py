import json
import os
import time

import paho.mqtt.client as mqtt
from gpiozero import OutputDevice


MQTT_HOST = os.getenv("SMARTFARM_MQTT_HOST", "192.168.137.1")
MQTT_PORT = int(os.getenv("SMARTFARM_MQTT_PORT", "1883"))
DEVICE_ID = os.getenv("SMARTFARM_DEVICE_ID", "1")
CONTROL_TOPIC = os.getenv("SMARTFARM_CONTROL_TOPIC", f"smartfarm/{DEVICE_ID}/control")

WATER_RELAY_PIN = int(os.getenv("SMARTFARM_WATER_RELAY_PIN", "17"))
NUTRIENT_RELAY_PIN = int(os.getenv("SMARTFARM_NUTRIENT_RELAY_PIN", "27"))
ACTIVE_HIGH = os.getenv("SMARTFARM_RELAY_ACTIVE_HIGH", "false").lower() == "true"

water_relay = OutputDevice(WATER_RELAY_PIN, active_high=ACTIVE_HIGH, initial_value=False)
nutrient_relay = OutputDevice(NUTRIENT_RELAY_PIN, active_high=ACTIVE_HIGH, initial_value=False)


def run_relay(relay: OutputDevice, duration: int) -> None:
    relay.on()
    time.sleep(max(1, min(duration, 60)))
    relay.off()


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"MQTT connected: {reason_code}")
    client.subscribe(CONTROL_TOPIC)
    print(f"Subscribed: {CONTROL_TOPIC}")


def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8", errors="replace")
    print(f"Received {msg.topic}: {payload}")

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        print("Invalid JSON payload")
        return

    command = str(data.get("command", "")).upper()
    duration = int(data.get("duration", 30))

    if command == "PUMP_ON":
        print(f"Water pump ON for {duration}s")
        run_relay(water_relay, duration)
    elif command == "NUTRIENT_ON":
        print(f"Nutrient pump ON for {duration}s")
        run_relay(nutrient_relay, duration)
    else:
        print(f"Unknown command: {command}")


def main():
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"smartfarm-pi-{DEVICE_ID}")
    except AttributeError:
        client = mqtt.Client(client_id=f"smartfarm-pi-{DEVICE_ID}")
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    print(f"Connecting MQTT broker {MQTT_HOST}:{MQTT_PORT}")
    client.loop_forever()


if __name__ == "__main__":
    main()
