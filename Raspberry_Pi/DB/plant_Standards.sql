-- Calibration standards for basil.
-- Adjust these values after measuring the real pot in dry and watered states.
CREATE DATABASE IF NOT EXISTS smartfarm
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE smartfarm;

CREATE TABLE IF NOT EXISTS plant_standards (
    plant_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plant_name VARCHAR(50) NOT NULL,
    temp_min DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
    temp_max DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
    humidity_max DECIMAL(5, 2) NOT NULL DEFAULT 75.00,
    moisture_min DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
    moisture_max DECIMAL(5, 2) NOT NULL DEFAULT 80.00,
    soil_dry_raw INT NOT NULL DEFAULT 820,
    soil_wet_raw INT NOT NULL DEFAULT 310,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO plant_standards (
    plant_name, temp_min, temp_max, humidity_max,
    moisture_min, moisture_max, soil_dry_raw, soil_wet_raw
)
VALUES ('Sweet Basil', 15.00, 30.00, 75.00, 30.00, 80.00, 820, 310)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
