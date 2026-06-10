#!/usr/bin/env bash
set -euo pipefail

export SMARTFARM_MQTT_HOST="${SMARTFARM_MQTT_HOST:-100.112.79.66}"
export SMARTFARM_MQTT_PORT="${SMARTFARM_MQTT_PORT:-1883}"
export SMARTFARM_DEVICE_ID="${SMARTFARM_DEVICE_ID:-RASP_001}"
export SMARTFARM_SENSOR_INTERVAL="${SMARTFARM_SENSOR_INTERVAL:-60}"
export SMARTFARM_BACKEND_URL="${SMARTFARM_BACKEND_URL:-http://${SMARTFARM_MQTT_HOST}:8080}"
export PYTHONUNBUFFERED=1

MODE_ARGS=()
if [ "${SMARTFARM_SENSOR_MODE:-hardware}" = "hardware" ]; then
  MODE_ARGS+=(--hardware)
fi

echo "Starting SmartFarm sensor publisher"
echo "MQTT: ${SMARTFARM_MQTT_HOST}:${SMARTFARM_MQTT_PORT}"
echo "Device: ${SMARTFARM_DEVICE_ID}"
echo "Interval: ${SMARTFARM_SENSOR_INTERVAL}s"
echo "Mode: ${SMARTFARM_SENSOR_MODE:-hardware}"
echo "Backend: ${SMARTFARM_BACKEND_URL}"

python3 "$(dirname "$0")/sensor_mqtt_publisher.py" \
  --broker-host "$SMARTFARM_MQTT_HOST" \
  --broker-port "$SMARTFARM_MQTT_PORT" \
  --device-id "$SMARTFARM_DEVICE_ID" \
  --interval "$SMARTFARM_SENSOR_INTERVAL" \
  "${MODE_ARGS[@]}"
