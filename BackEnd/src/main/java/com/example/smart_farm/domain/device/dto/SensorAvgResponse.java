package com.example.smart_farm.domain.device.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class SensorAvgResponse {
    private String timeRange;      // "00-02", "02-04" 등
    private Double avgTemperature;
    private Double avgHumidity;
    private Double avgSoilMoisture;
    private Double avgIlluminance;
}