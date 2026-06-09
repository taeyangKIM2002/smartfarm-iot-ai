package com.example.smart_farm.domain.user.entity;

import com.example.smart_farm.domain.device.entity.Device;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id; // [cite: 66]

    @Column(nullable = false, unique = true)
    private String email; // 로그인 이메일 [cite: 67]

    @Column(nullable = false)
    private String password; // 암호화된 비밀번호 [cite: 68]

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private Device device; // 소유한 기기 ID [cite: 68, 74, 77]

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now(); // [cite: 69]

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now(); // [cite: 70, 71]

    @Builder
    public User(String email, String password, Device device) {
        this.email = email;
        this.password = password;
        this.device = device;
    }
}