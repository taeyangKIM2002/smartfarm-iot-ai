package com.example.smart_farm.domain.user.controller;

import com.example.smart_farm.domain.user.dto.LoginRequest;
import com.example.smart_farm.domain.user.dto.LoginResponse;
import com.example.smart_farm.domain.user.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth") //
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;

    // 로그인 (토큰 발급) API [cite: 96]
    @PostMapping("/login") //
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response); // 200 OK 반환 [cite: 104]
    }
}