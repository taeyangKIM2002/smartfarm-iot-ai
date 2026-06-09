package com.example.smart_farm.domain.device.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ControlCommandDto {
    // 제어할 장치나 동작의 종류 [cite: 42]
    private String actionType;  // 예: "WATER", "PESTICIDE", "LED" 등 [cite: 42]

    // 이 명령이 어떻게 발생했는지 출처
    private String triggerType; // 예: "AUTO"(서버 자동), "MANUAL"(대시보드 수동)
}