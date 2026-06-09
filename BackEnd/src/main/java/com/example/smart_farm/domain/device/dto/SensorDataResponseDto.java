package com.example.smart_farm.domain.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class SensorDataResponseDto {
    private String deviceId;
    private List<SensorLogDetailDto> data;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class SensorLogDetailDto {
        private BigDecimal temperature;
        private BigDecimal humidity;
        private BigDecimal soilMoisture;
        private Integer illuminance;
        private Boolean isAbnormal;
        private String emotionStatus;
        private String emotionMessage;
        private String gifName;
        private LocalDateTime createdAt;
    }
}
