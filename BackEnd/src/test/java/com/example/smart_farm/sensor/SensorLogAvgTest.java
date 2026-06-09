package com.example.smart_farm.sensor;

import com.example.smart_farm.domain.device.dto.SensorAvgResponse;
import com.example.smart_farm.domain.device.entity.Device;
import com.example.smart_farm.domain.device.entity.SensorLog;
import com.example.smart_farm.domain.device.repository.SensorLogRepository;
import com.example.smart_farm.domain.device.service.SensorLogService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SensorLogAvgTest {

    @InjectMocks
    private SensorLogService sensorLogService;

    @Mock
    private SensorLogRepository sensorLogRepository;

    private final String DEVICE_ID = "DEVICE_001";

    @Test
    @DisplayName("성공: 오늘 데이터가 있을 때 2시간 단위로 평균이 계산되어야 한다")
    void getTodayTwoHourAverages_Success() {
        // given
        LocalDateTime now = LocalDateTime.now();
        // 01:00 데이터 (00-02 구간)
        SensorLog log1 = createLog(now.with(LocalTime.of(1, 0)), 20.0, 50.0);
        // 01:30 데이터 (00-02 구간)
        SensorLog log2 = createLog(now.with(LocalTime.of(1, 30)), 30.0, 60.0);
        // 03:00 데이터 (02-04 구간)
        SensorLog log3 = createLog(now.with(LocalTime.of(3, 0)), 25.0, 55.0);

        when(sensorLogRepository.findByDeviceIdAndCreatedAtBetween(eq(DEVICE_ID), any(), any()))
                .thenReturn(List.of(log1, log2, log3));

        // when
        List<SensorAvgResponse> result = sensorLogService.getTodayTwoHourAverages(DEVICE_ID);

        // then
        assertThat(result).hasSize(12); // 24시간 / 2시간 = 12개 구간

        // 00-02 구간 확인 (평균: 25.0, 55.0)
        assertThat(result.get(0).getTimeRange()).isEqualTo("00-02");
        assertThat(result.get(0).getAvgTemperature()).isEqualTo(25.0);
        assertThat(result.get(0).getAvgHumidity()).isEqualTo(55.0);

        // 02-04 구간 확인 (평균: 25.0, 55.0)
        assertThat(result.get(1).getTimeRange()).isEqualTo("02-04");
        assertThat(result.get(1).getAvgTemperature()).isEqualTo(25.0);
    }

    @Test
    @DisplayName("성공: 오늘 데이터가 하나도 없을 때 모든 구간의 평균은 0이어야 한다")
    void getTodayTwoHourAverages_Empty() {
        // given
        when(sensorLogRepository.findByDeviceIdAndCreatedAtBetween(eq(DEVICE_ID), any(), any()))
                .thenReturn(Collections.emptyList());

        // when
        List<SensorAvgResponse> result = sensorLogService.getTodayTwoHourAverages(DEVICE_ID);

        // then
        assertThat(result).hasSize(12);
        assertThat(result.stream().allMatch(r -> r.getAvgTemperature() == 0.0)).isTrue();
    }

    @Test
    @DisplayName("예외: DB 조회 중 런타임 예외가 발생하면 서비스 계층에서 예외를 던져야 한다")
    void getTodayTwoHourAverages_Exception() {
        // given
        when(sensorLogRepository.findByDeviceIdAndCreatedAtBetween(eq(DEVICE_ID), any(), any()))
                .thenThrow(new RuntimeException("DB Connection Error"));

        // when & then
        try {
            sensorLogService.getTodayTwoHourAverages(DEVICE_ID);
        } catch (RuntimeException e) {
            assertThat(e.getMessage()).isEqualTo("DB Connection Error");
        }
    }

    // Helper method to create SensorLog
    private SensorLog createLog(LocalDateTime time, double temp, double humid) {
        return SensorLog.builder()
                .device(null) // 테스트에서는 Device 엔티티 자체가 중요하지 않음
                .temperature(BigDecimal.valueOf(temp))
                .humidity(BigDecimal.valueOf(humid))
                .soilMoisture(BigDecimal.valueOf(10.0))
                .illuminance(100)
                .isAbnormal(false)
                .createdAt(time)
                .build();
    }
}