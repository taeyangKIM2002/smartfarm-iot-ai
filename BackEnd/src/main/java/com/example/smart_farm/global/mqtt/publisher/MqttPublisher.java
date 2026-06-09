package com.example.smart_farm.global.mqtt.publisher;

import org.springframework.integration.annotation.MessagingGateway;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.handler.annotation.Header;

@MessagingGateway(defaultRequestChannel = "mqttOutboundChannel")
public interface MqttPublisher {

    // 특정 토픽으로 JSON 형태의 제어 명령 전송
    void sendControlCommand(@Header(MqttHeaders.TOPIC) String topic, String payload);
}
