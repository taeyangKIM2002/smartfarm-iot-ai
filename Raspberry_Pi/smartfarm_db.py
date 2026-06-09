import datetime
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS sensor_emotion_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    measured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    soil_raw INTEGER,
    soil_moisture REAL NOT NULL,
    illuminance INTEGER,
    emotion_status TEXT NOT NULL,
    emotion_message TEXT,
    gif_name TEXT NOT NULL,
    is_abnormal INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sensor_emotion_logs_device_time
ON sensor_emotion_logs (device_id, measured_at DESC);
"""


class SmartFarmDatabase:
    def __init__(self, db_path: str | Path | None = None, backend: str | None = None):
        self.db_path = Path(db_path or os.getenv("SMARTFARM_SQLITE_PATH", "smartfarm.sqlite3"))
        self.backend = backend or os.getenv("SMARTFARM_DB_BACKEND", "sqlite")

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def initialize(self) -> None:
        if self.backend == "mysql":
            self._initialize_mysql()
            return

        with self.connect() as conn:
            conn.executescript(SQLITE_SCHEMA)

    def insert_payload(self, payload: dict) -> int:
        if self.backend == "mysql":
            return self._insert_payload_mysql(payload)

        self.initialize()
        with self.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO sensor_emotion_logs (
                    device_id, measured_at, temperature, humidity, soil_raw,
                    soil_moisture, illuminance, emotion_status, emotion_message,
                    gif_name, is_abnormal
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["deviceId"],
                    payload.get("measuredAt") or datetime.datetime.now().isoformat(timespec="seconds"),
                    payload["temperature"],
                    payload["humidity"],
                    payload.get("soilRaw"),
                    payload["soilMoisture"],
                    payload.get("illuminance"),
                    payload["emotionStatus"],
                    payload.get("emotionMessage"),
                    payload["gifName"],
                    1 if payload.get("isAbnormal") else 0,
                ),
            )
            return int(cursor.lastrowid)

    def latest(self, device_id: str) -> dict | None:
        if self.backend == "mysql":
            return self._latest_mysql(device_id)

        self.initialize()
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT *
                FROM sensor_emotion_logs
                WHERE device_id = ?
                ORDER BY measured_at DESC, id DESC
                LIMIT 1
                """,
                (device_id,),
            ).fetchone()
        return dict(row) if row else None

    def _connect_mysql(self):
        try:
            import pymysql
        except ImportError as exc:
            raise RuntimeError("MySQL mode requires pymysql. Install it or use SMARTFARM_DB_BACKEND=sqlite.") from exc

        return pymysql.connect(
            host=os.getenv("SMARTFARM_MYSQL_HOST", "localhost"),
            port=int(os.getenv("SMARTFARM_MYSQL_PORT", "3306")),
            user=os.getenv("SMARTFARM_MYSQL_USER", "root"),
            password=os.getenv("SMARTFARM_MYSQL_PASSWORD", "root"),
            database=os.getenv("SMARTFARM_MYSQL_DATABASE", "smartfarm"),
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False,
        )

    def _initialize_mysql(self) -> None:
        schema_path = Path(__file__).resolve().parent / "DB" / "Basil_sensor_logs.sql"
        schema_sql = "\n".join(
            line for line in schema_path.read_text(encoding="utf-8").splitlines()
            if not line.strip().startswith("--")
        )
        statements = [
            stmt.strip()
            for stmt in schema_sql.split(";")
            if stmt.strip()
        ]
        conn = self._connect_mysql()
        try:
            with conn.cursor() as cursor:
                for statement in statements:
                    cursor.execute(statement)
            conn.commit()
        finally:
            conn.close()

    def _insert_payload_mysql(self, payload: dict) -> int:
        self.initialize()
        conn = self._connect_mysql()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO sensor_emotion_logs (
                        device_id, measured_at, temperature, humidity, soil_raw,
                        soil_moisture, illuminance, emotion_status, emotion_message,
                        gif_name, is_abnormal
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        payload["deviceId"],
                        payload.get("measuredAt") or datetime.datetime.now().isoformat(timespec="seconds"),
                        payload["temperature"],
                        payload["humidity"],
                        payload.get("soilRaw"),
                        payload["soilMoisture"],
                        payload.get("illuminance"),
                        payload["emotionStatus"],
                        payload.get("emotionMessage"),
                        payload["gifName"],
                        1 if payload.get("isAbnormal") else 0,
                    ),
                )
                row_id = cursor.lastrowid
            conn.commit()
            return int(row_id)
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _latest_mysql(self, device_id: str) -> dict | None:
        self.initialize()
        conn = self._connect_mysql()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        id, device_id, measured_at, temperature, humidity, soil_raw,
                        soil_moisture, illuminance, emotion_status, emotion_message,
                        gif_name, is_abnormal
                    FROM sensor_emotion_logs
                    WHERE device_id = %s
                    ORDER BY measured_at DESC, id DESC
                    LIMIT 1
                    """,
                    (device_id,),
                )
                return cursor.fetchone()
        finally:
            conn.close()
