package com.example.smart_farm.global.mqtt.handler;

import com.example.smart_farm.domain.device.dto.SensorLogDataDto;
import com.example.smart_farm.global.mqtt.service.MqttService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.MessagingException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MqttSensorDataHandler implements MessageHandler {

    private final MqttService mqttService;

    @Override
    public void handleMessage(Message<?> message) throws MessagingException {
        if (message.getPayload() instanceof SensorLogDataDto dto) {
            mqttService.saveSensorData(dto);
        }
    }
}
