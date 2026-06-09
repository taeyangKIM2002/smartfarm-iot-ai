package com.example.smart_farm.domain.device.service;

import com.example.smart_farm.domain.device.dto.SensorAvgResponse;
import com.example.smart_farm.domain.device.entity.SensorLog;
import com.example.smart_farm.domain.device.repository.SensorLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SensorLogService {

    private final SensorLogRepository sensorLogRepository;

    @Transactional(readOnly = true)
    public List<SensorAvgResponse> getTodayTwoHourAverages(String deviceId) {
        // 1. 오늘 00:00 ~ 23:59 범위 설정
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDateTime.now().with(LocalTime.MAX);

        // 2. 데이터 조회
        List<SensorLog> logs = sensorLogRepository.findByDeviceIdAndCreatedAtBetween(deviceId, start, end);

        // 3. 2시간 단위로 그룹화 (0~1시 -> 0시, 2~3시 -> 2시 ...)
        Map<Integer, List<SensorLog>> groupedLogs = logs.stream()
                .collect(Collectors.groupingBy(log -> (log.getCreatedAt().getHour() / 2) * 2));

        // 4. 시간대별 평균 계산 및 DTO 변환
        List<SensorAvgResponse> result = new ArrayList<>();

        // 0시부터 22시까지 2시간 간격으로 루프 (데이터가 없는 구간도 포함하기 위함)
        for (int hour = 0; hour <= 22; hour += 2) {
            List<SensorLog> intervalLogs = groupedLogs.getOrDefault(hour, new ArrayList<>());
            String timeLabel = String.format("%02d-%02d", hour, hour + 2);

            if (intervalLogs.isEmpty()) {
                result.add(new SensorAvgResponse(timeLabel, 0.0, 0.0, 0.0, 0.0));
                continue;
            }

            // 평균 계산
            double avgTemp = intervalLogs.stream()
                    .mapToDouble(l -> l.getTemperature().doubleValue()).average().orElse(0.0);
            double avgHumid = intervalLogs.stream()
                    .mapToDouble(l -> l.getHumidity().doubleValue()).average().orElse(0.0);
            double avgSoil = intervalLogs.stream()
                    .mapToDouble(l -> l.getSoilMoisture().doubleValue()).average().orElse(0.0);
            double avgIllum = intervalLogs.stream()
                    .mapToInt(SensorLog::getIlluminance).average().orElse(0.0);

            result.add(new SensorAvgResponse(timeLabel,
                    round(avgTemp), round(avgHumid), round(avgSoil), round(avgIllum)));
        }

        return result;
    }

    // 소수점 둘째자리까지 반올림하는 헬퍼 메서드
    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
