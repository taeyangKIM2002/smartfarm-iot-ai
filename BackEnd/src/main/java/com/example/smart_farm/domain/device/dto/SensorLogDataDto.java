package com.example.smart_farm.domain.device.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class SensorLogDataDto {
    private String deviceId;
    private BigDecimal temperature;
    private BigDecimal humidity;
    private BigDecimal soilMoisture;
    private Integer illuminance;
    private String emotionStatus;
    private String emotionMessage;
    private String gifName;
    private LocalDateTime measuredAt;
}
