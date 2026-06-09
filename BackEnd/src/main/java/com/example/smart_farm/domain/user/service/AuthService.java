package com.example.smart_farm.domain.user.service;

import com.example.smart_farm.domain.device.entity.Device;
import com.example.smart_farm.domain.device.repository.DeviceRepository;
import com.example.smart_farm.domain.user.dto.LoginRequest;
import com.example.smart_farm.domain.user.dto.LoginResponse;
import com.example.smart_farm.domain.user.entity.User;
import com.example.smart_farm.domain.user.repository.UserRepository;
import com.example.smart_farm.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final DeviceRepository deviceRepository;
    private final Long expireIn = 3600L; //토큰 만료 시간 1시간

    @Transactional
    public void signup(String email, String password, String deviceId) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }

// AuthService.java 내부
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기기입니다."));

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .device(device) // .deviceId(deviceId) 대신 객체를 통째로!
                .build();

        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) { // String 대신 LoginRequest DTO를 받게 수정했네
        log.info("로그인 시도 이메일: [{}]", request.getEmail());

        // 1. 이메일로 유저 조회
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일입니다."));

        // 2. 비밀번호 검증
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("잘못된 비밀번호입니다.");
        }

        // 3. Access Token
        // 보통 실무에서는 두 토큰을 동시에 생성해서 넘겨준다네.
        String accessToken = jwtTokenProvider.createAccessToken(user.getEmail());

        // 4. 응답 DTO 반환 (성공 여부와 토큰들을 담아서!) [cite: 108, 109]
        return LoginResponse.builder()
                .success(true)
                .accessToken(accessToken)
                .accessTokenExpiresIn(expireIn)
                .build();
    }
}