package com.example.smart_farm.global.config;

import com.example.smart_farm.domain.device.entity.Device;
import com.example.smart_farm.domain.device.repository.DeviceRepository;
import com.example.smart_farm.domain.user.entity.User;
import com.example.smart_farm.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DemoDataInitializer implements ApplicationRunner {

    private static final String DEMO_EMAIL = "demo@gmail.com";
    private static final String DEMO_PASSWORD = "1234";
    private static final String DEMO_DEVICE_ID = "RASP_001";

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Device device = deviceRepository.findById(DEMO_DEVICE_ID)
                .orElseGet(() -> deviceRepository.save(Device.builder()
                        .id(DEMO_DEVICE_ID)
                        .name("Sweet Basil Demo Device")
                        .plantType("Sweet Basil")
                        .ipAddress("192.168.137.10")
                        .build()));

        if (!userRepository.existsByEmail(DEMO_EMAIL)) {
            userRepository.save(User.builder()
                    .email(DEMO_EMAIL)
                    .password(passwordEncoder.encode(DEMO_PASSWORD))
                    .device(device)
                    .build());
        }
    }
}
