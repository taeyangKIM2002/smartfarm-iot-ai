package com.example.smart_farm.domain.device.repository;

import com.example.smart_farm.domain.device.entity.Device;
import com.example.smart_farm.domain.device.entity.SensorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SensorLogRepository extends JpaRepository<SensorLog, Long> {
    //기기 ID(String)로 가장 최근 로그 하나 찾기
    Optional<SensorLog> findTopByDeviceIdOrderByCreatedAtDesc(String deviceId);

    //Device 객체로 최근 로그 탐색
    Optional<SensorLog> findTopByDeviceOrderByCreatedAtDesc(Device device);

    boolean existsByDeviceIdAndCreatedAt(String deviceId, LocalDateTime createdAt);

    List<SensorLog> findByDeviceIdOrderByCreatedAtDesc(String deviceId, Pageable pageable);

    /**
     * 특정 기기의 특정 시간 범위 내 로그 조회
     */
    List<SensorLog> findByDeviceIdAndCreatedAtBetween(String deviceId, LocalDateTime start, LocalDateTime end);

    List<SensorLog> findByDeviceIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            String deviceId,
            LocalDateTime start,
            LocalDateTime end
    );

    /**
     * 특정 기기의 특정 시간 범위 내 로그 조회 (Device 객체 기준)
     */
    List<SensorLog> findByDeviceAndCreatedAtBetween(Device device, LocalDateTime start, LocalDateTime end);
}
