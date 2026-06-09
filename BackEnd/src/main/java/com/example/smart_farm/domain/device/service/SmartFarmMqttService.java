package com.example.smart_farm.domain.device.service;

import com.example.smart_farm.domain.device.dto.ControlCommandDto;
import com.example.smart_farm.domain.device.dto.SensorLogDataDto;
import com.example.smart_farm.domain.device.entity.Device;
import com.example.smart_farm.domain.device.entity.SensorLog;
import com.example.smart_farm.domain.device.repository.DeviceRepository;
import com.example.smart_farm.domain.device.repository.SensorLogRepository;
import com.example.smart_farm.global.mqtt.publisher.MqttPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmartFarmMqttService {

    private final DeviceRepository deviceRepository;
    private final SensorLogRepository sensorLogRepository;
    private final MqttPublisher mqttPublisher;
    private final ObjectMapper objectMapper;

    @ServiceActivator(inputChannel = "mqttInputChannel")
    @Transactional
    public void handleMessage(Message<String> message) {
        String topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC, String.class);
        String payload = message.getPayload();

        try {
            if (topic != null && topic.endsWith("/sensor")) {
                processSensorData(payload);
            } else if (topic != null && topic.endsWith("/ai")) {
                processAiData(payload);
            }
        } catch (Exception e) {
            log.error("MQTT message handling failed. topic={}, payload={}, error={}", topic, payload, e.getMessage(), e);
        }
    }

    private void processSensorData(String payload) throws JsonProcessingException {
        SensorLogDataDto dto = objectMapper.readValue(payload, SensorLogDataDto.class);
        validateSensorData(dto);

        Device device = deviceRepository.findById(dto.getDeviceId())
                .orElseGet(() -> deviceRepository.save(Device.builder()
                        .id(dto.getDeviceId())
                        .name("Sweet Basil")
                        .plantType("Basil")
                        .ipAddress("192.168.137.10")
                        .build()));

        boolean isAbnormal = dto.getTemperature().compareTo(new BigDecimal("40.0")) > 0
                || dto.getSoilMoisture().compareTo(new BigDecimal("10.0")) < 0
                || (dto.getEmotionStatus() != null && !"happy".equals(dto.getEmotionStatus()));

        SensorLog logEntity = SensorLog.builder()
                .device(device)
                .temperature(dto.getTemperature())
                .humidity(dto.getHumidity())
                .soilMoisture(dto.getSoilMoisture())
                .illuminance(dto.getIlluminance())
                .emotionStatus(dto.getEmotionStatus())
                .emotionMessage(dto.getEmotionMessage())
                .gifName(dto.getGifName())
                .isAbnormal(isAbnormal)
                .createdAt(dto.getMeasuredAt())
                .build();

        sensorLogRepository.save(logEntity);
        log.info("Sensor data saved. deviceId={}, temp={}, humidity={}, soil={}, emotion={}",
                dto.getDeviceId(), dto.getTemperature(), dto.getHumidity(), dto.getSoilMoisture(), dto.getEmotionStatus());

        if (dto.getSoilMoisture().compareTo(new BigDecimal("30.0")) < 0) {
            triggerActuator(dto.getDeviceId(), "WATER", "AUTO");
        }
    }

    private void validateSensorData(SensorLogDataDto dto) {
        if (dto.getDeviceId() == null || dto.getDeviceId().isBlank()) {
            throw new IllegalArgumentException("deviceId is required");
        }
        if (dto.getTemperature() == null || dto.getHumidity() == null || dto.getSoilMoisture() == null) {
            throw new IllegalArgumentException("temperature, humidity and soilMoisture are required");
        }
    }

    private void processAiData(String payload) {
        log.info("AI result received. payload={}", payload);
    }

    public void triggerActuator(String deviceId, String actionType, String triggerType) {
        try {
            ControlCommandDto command = ControlCommandDto.builder()
                    .actionType(actionType)
                    .triggerType(triggerType)
                    .build();

            String jsonPayload = objectMapper.writeValueAsString(command);
            String controlTopic = "smartfarm/" + deviceId + "/control";

            mqttPublisher.sendControlCommand(controlTopic, jsonPayload);
            log.info("Control command sent. topic={}, payload={}", controlTopic, jsonPayload);
        } catch (JsonProcessingException e) {
            log.error("Control command JSON serialization failed", e);
        }
    }
}
