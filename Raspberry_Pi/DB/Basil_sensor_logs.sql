-- MySQL schema for raw sensor readings and evaluated basil emotion logs.
CREATE DATABASE IF NOT EXISTS smartfarm
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE smartfarm;

CREATE TABLE IF NOT EXISTS sensor_emotion_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    measured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    temperature DECIMAL(5, 2) NOT NULL,
    humidity DECIMAL(5, 2) NOT NULL,
    soil_raw INT NULL,
    soil_moisture DECIMAL(5, 2) NOT NULL,
    illuminance INT NULL,
    emotion_status VARCHAR(30) NOT NULL,
    emotion_message VARCHAR(255) NULL,
    gif_name VARCHAR(80) NOT NULL,
    is_abnormal TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_sensor_emotion_logs_device_time (device_id, measured_at DESC),
    INDEX idx_sensor_emotion_logs_emotion (emotion_status)
);

-- Example API payload shape:
-- {
--   "deviceId": "RASP_001",
--   "temperature": 24.2,
--   "humidity": 58.1,
--   "soilMoisture": 62.4,
--   "soilRaw": 501,
--   "emotionStatus": "happy",
--   "gifName": "happy.gif",
--   "measuredAt": "2026-05-27T18:30:00"
-- }
