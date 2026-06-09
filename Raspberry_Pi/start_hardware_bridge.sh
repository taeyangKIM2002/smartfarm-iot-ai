#!/usr/bin/env bash
set -euo pipefail

export SMARTFARM_MQTT_HOST="${SMARTFARM_MQTT_HOST:-100.112.79.66}"
export SMARTFARM_MQTT_PORT="${SMARTFARM_MQTT_PORT:-1883}"
export SMARTFARM_DEVICE_ID="${SMARTFARM_DEVICE_ID:-RASP_001}"
export SMARTFARM_CONTROL_TOPIC="${SMARTFARM_CONTROL_TOPIC:-smartfarm/${SMARTFARM_DEVICE_ID}/control}"

echo "Starting SmartFarm hardware MQTT bridge"
echo "MQTT: ${SMARTFARM_MQTT_HOST}:${SMARTFARM_MQTT_PORT}"
echo "Topic: ${SMARTFARM_CONTROL_TOPIC}"

python3 "$(dirname "$0")/hardware_mqtt_control.py"
