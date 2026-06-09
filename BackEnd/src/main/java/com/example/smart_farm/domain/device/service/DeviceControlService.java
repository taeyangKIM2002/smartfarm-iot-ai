package com.example.smart_farm.domain.device.service;

import com.example.smart_farm.global.mqtt.publisher.MqttPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceControlService {

    private final MqttPublisher mqttPublisher;

    public boolean turnOnWaterPump(String deviceId) {
        return sendControlCommand(deviceId, "PUMP_ON", 10);
    }

    public boolean turnOnNutrientPump(String deviceId) {
        return sendControlCommand(deviceId, "NUTRIENT_ON", 10);
    }

    private boolean sendControlCommand(String deviceId, String command, int duration) {
        String topic = "smartfarm/" + deviceId + "/control";
        String payload = String.format("{\"command\": \"%s\", \"duration\": %d}", command, duration);

        try {
            mqttPublisher.sendControlCommand(topic, payload);
            log.info("제어 명령 발송 완료 - 대상: {}, 명령: {}", topic, payload);
            return true;
        } catch (Exception e) {
            log.error("제어 명령 발송 실패 - 대상: {}, 명령: {}, 오류: {}", topic, payload, e.getMessage());
            return false;
        }
    }
}
