package com.example.smart_farm.domain.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LoginRequest {
    private String email;    // [cite: 102]
    private String password; // [cite: 103]
}