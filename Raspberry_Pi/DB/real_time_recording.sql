-- SQLite schema used by Raspberry Pi local logging.
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
