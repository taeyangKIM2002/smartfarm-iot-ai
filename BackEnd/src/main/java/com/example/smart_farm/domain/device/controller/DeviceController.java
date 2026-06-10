package com.example.smart_farm.domain.device.controller;

import com.example.smart_farm.domain.device.dto.SensorAvgResponse;
import com.example.smart_farm.domain.device.dto.SensorDataResponseDto;
import com.example.smart_farm.domain.device.dto.SensorLogDataDto;
import com.example.smart_farm.domain.device.entity.SensorLog;
import com.example.smart_farm.domain.device.repository.SensorLogRepository;
import com.example.smart_farm.domain.device.service.DeviceControlService;
import com.example.smart_farm.domain.device.service.SensorLogService;
import com.example.smart_farm.domain.device.service.SmartFarmMqttService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final SensorLogRepository sensorLogRepository;
    private final SensorLogService sensorLogService;
    private final DeviceControlService deviceControlService;
    private final SmartFarmMqttService smartFarmMqttService;

    @GetMapping("/{deviceId}/sensors")
    public ResponseEntity<SensorDataResponseDto> getLatestSensorData(@PathVariable String deviceId) {
        SensorDataResponseDto.SensorLogDetailDto detail = sensorLogRepository.findTopByDeviceIdOrderByCreatedAtDesc(deviceId)
                .map(this::convertToDetailDto)
                .orElseGet(this::createDemoSensorData);

        return ResponseEntity.ok(SensorDataResponseDto.builder()
                .deviceId(deviceId)
                .data(List.of(detail))
                .build());
    }

    @GetMapping("/{deviceId}/history")
    public ResponseEntity<SensorDataResponseDto> getSensorHistory(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "100") int limit) {

        Pageable pageable = PageRequest.of(0, limit);
        List<SensorLog> logs = sensorLogRepository.findByDeviceIdOrderByCreatedAtDesc(deviceId, pageable);

        List<SensorDataResponseDto.SensorLogDetailDto> dataList = logs.stream()
                .map(this::convertToDetailDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(SensorDataResponseDto.builder()
                .deviceId(deviceId)
                .data(dataList)
                .build());
    }

    @GetMapping("/{deviceId}/today-avg")
    public ResponseEntity<List<SensorAvgResponse>> getTodayAverages(@PathVariable String deviceId) {
        List<SensorAvgResponse> data = sensorLogService.getTodayTwoHourAverages(deviceId);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/{deviceId}/history/day")
    public ResponseEntity<SensorDataResponseDto> getSensorHistoryByDate(
            @PathVariable String deviceId,
            @RequestParam String date) {

        LocalDate targetDate = LocalDate.parse(date);
        LocalDateTime start = targetDate.atStartOfDay();
        LocalDateTime end = targetDate.plusDays(1).atStartOfDay();

        List<SensorLog> logs = sensorLogRepository
                .findByDeviceIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(deviceId, start, end)
                .stream()
                .sorted((left, right) -> left.getCreatedAt().compareTo(right.getCreatedAt()))
                .collect(Collectors.toList());

        List<SensorDataResponseDto.SensorLogDetailDto> dataList = logs.stream()
                .map(this::convertToDetailDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(SensorDataResponseDto.builder()
                .deviceId(deviceId)
                .data(dataList)
                .build());
    }

    @PostMapping("/{deviceId}/control")
    public ResponseEntity<Map<String, Object>> controlDevice(
            @PathVariable String deviceId,
            @RequestBody Map<String, String> request) {

        String action = request.getOrDefault("action", "water").toLowerCase();
        return switch (action) {
            case "water" -> buildControlResponse(deviceId, "water", "PUMP_ON", deviceControlService.turnOnWaterPump(deviceId));
            case "nutrient", "fertilizer", "pesticide" ->
                    buildControlResponse(deviceId, "nutrient", "NUTRIENT_ON", deviceControlService.turnOnNutrientPump(deviceId));
            default -> throw new IllegalArgumentException("지원하지 않는 제어 명령입니다: " + action);
        };
    }

    @PostMapping("/{deviceId}/water-pump-control")
    public ResponseEntity<Map<String, Object>> controlWaterPump(@PathVariable String deviceId) {
        return buildControlResponse(deviceId, "water", "PUMP_ON", deviceControlService.turnOnWaterPump(deviceId));
    }

    @PostMapping("/{deviceId}/supplement-control")
    public ResponseEntity<Map<String, Object>> controlSupplement(@PathVariable String deviceId) {
        return buildControlResponse(deviceId, "nutrient", "NUTRIENT_ON", deviceControlService.turnOnNutrientPump(deviceId));
    }

    private ResponseEntity<Map<String, Object>> buildControlResponse(
            String deviceId,
            String action,
            String command,
            boolean mqttPublished) {

        return ResponseEntity.ok(Map.of(
                "success", true,
                "deviceId", deviceId,
                "action", action,
                "command", command,
                "mqttPublished", mqttPublished
        ));
    }

    @PostMapping("/{deviceId}/sensors/sync")
    public ResponseEntity<Map<String, Object>> syncSensorData(
            @PathVariable String deviceId,
            @RequestBody List<SensorLogDataDto> payloads) {

        int saved = 0;
        for (SensorLogDataDto payload : payloads) {
            payload.setDeviceId(deviceId);
            if (smartFarmMqttService.saveSensorData(payload)) {
                saved++;
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "deviceId", deviceId,
                "received", payloads.size(),
                "saved", saved,
                "skipped", payloads.size() - saved
        ));
    }

    private SensorDataResponseDto.SensorLogDetailDto convertToDetailDto(SensorLog log) {
        return SensorDataResponseDto.SensorLogDetailDto.builder()
                .temperature(log.getTemperature())
                .humidity(log.getHumidity())
                .soilMoisture(log.getSoilMoisture())
                .illuminance(log.getIlluminance())
                .isAbnormal(log.getIsAbnormal())
                .emotionStatus(log.getEmotionStatus())
                .emotionMessage(log.getEmotionMessage())
                .gifName(log.getGifName())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private SensorDataResponseDto.SensorLogDetailDto createDemoSensorData() {
        return SensorDataResponseDto.SensorLogDetailDto.builder()
                .temperature(BigDecimal.valueOf(24.5))
                .humidity(BigDecimal.valueOf(65))
                .soilMoisture(BigDecimal.valueOf(72))
                .illuminance(850)
                .isAbnormal(false)
                .emotionStatus("happy")
                .emotionMessage("센서 데이터 수신 전 기본 시연 데이터입니다.")
                .gifName("happy.gif")
                .createdAt(LocalDateTime.now())
                .build();
    }
}
