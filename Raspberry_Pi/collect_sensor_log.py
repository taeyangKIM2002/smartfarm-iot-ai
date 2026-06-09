import argparse
import json
import time

from BasilEmotionEngine import BasilEmotionEngine
from sensor_reader import SensorReader
from smartfarm_db import SmartFarmDatabase


def collect_once(device_id: str, db: SmartFarmDatabase, reader: SensorReader) -> dict:
    reading = reader.read()
    payload = BasilEmotionEngine().build_payload(
        device_id=device_id,
        temperature=reading.temperature,
        humidity=reading.humidity,
        soil_moisture=reading.soil_moisture,
        soil_raw=reading.soil_raw,
        illuminance=reading.illuminance,
    )
    payload["logId"] = db.insert_payload(payload)
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect basil sensor data and store emotion logs.")
    parser.add_argument("--device-id", default="RASP_001")
    parser.add_argument("--db-path", default="DB/smartfarm.sqlite3")
    parser.add_argument("--interval", type=int, default=0, help="Seconds between reads. 0 runs once.")
    parser.add_argument("--hardware", action="store_true", help="Read real Raspberry Pi sensors instead of mock data.")
    args = parser.parse_args()

    db = SmartFarmDatabase(args.db_path)
    reader = SensorReader(mock=not args.hardware)

    while True:
        payload = collect_once(args.device_id, db, reader)
        print(json.dumps(payload, ensure_ascii=False))
        if args.interval <= 0:
            break
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
