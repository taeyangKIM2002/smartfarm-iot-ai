package com.example.smart_farm.domain.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
    private boolean success;     //성공여부
    private String accessToken;   //토큰
    private Long accessTokenExpiresIn;  //만료 시간
}