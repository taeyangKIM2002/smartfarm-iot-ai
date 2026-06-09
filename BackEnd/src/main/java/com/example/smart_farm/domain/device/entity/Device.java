package com.example.smart_farm.domain.device.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "devices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Device {

    @Id
    @Column(name = "device_id", length = 50)
    private String id; // 라즈베리파이 MAC 주소 또는 고유 ID [cite: 18]

    @Column(nullable = false, length = 100)
    private String name; // 식물 애칭 [cite: 19]

    @Column(name = "plant_type", length = 50)
    private String plantType; // 식물 종류 [cite: 19]

    @Column(name = "ip_address", length = 45)
    private String ipAddress; // 실시간 IP 주소 [cite: 20]

    @Column(length = 20)
    private String status = "ACTIVE"; // ACTIVE, OFFLINE, ERROR [cite: 21]

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now(); // [cite: 22]

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now(); // [cite: 23, 24]

    @Builder
    public Device(String id, String name, String plantType, String ipAddress) {
        this.id = id;
        this.name = name;
        this.plantType = plantType;
        this.ipAddress = ipAddress;
    }
}