package com.example.smart_farm.global.mqtt.service;

import com.example.smart_farm.domain.device.dto.SensorLogDataDto;
import com.example.smart_farm.domain.device.entity.Device;
import com.example.smart_farm.domain.device.entity.SensorLog;
import com.example.smart_farm.domain.device.repository.DeviceRepository;
import com.example.smart_farm.domain.device.repository.SensorLogRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MqttService {

    private final DeviceRepository deviceRepository;
    private final SensorLogRepository sensorLogRepository;

    @Transactional
    public void saveSensorData(SensorLogDataDto dto) {
        Device device = deviceRepository.findById(dto.getDeviceId())
                .orElseGet(() -> deviceRepository.save(Device.builder()
                        .id(dto.getDeviceId())
                        .name("Sweet Basil")
                        .plantType("Basil")
                        .ipAddress("192.168.137.10")
                        .build()));

        SensorLog sensorLog = SensorLog.builder()
                .device(device)
                .temperature(dto.getTemperature())
                .humidity(dto.getHumidity())
                .soilMoisture(dto.getSoilMoisture())
                .illuminance(dto.getIlluminance())
                .emotionStatus(dto.getEmotionStatus())
                .emotionMessage(dto.getEmotionMessage())
                .gifName(dto.getGifName())
                .isAbnormal(dto.getEmotionStatus() != null && !"happy".equals(dto.getEmotionStatus()))
                .build();

        sensorLogRepository.save(sensorLog);
        log.info("Saved sensor data. deviceId={}, emotion={}", dto.getDeviceId(), dto.getEmotionStatus());
    }
}
