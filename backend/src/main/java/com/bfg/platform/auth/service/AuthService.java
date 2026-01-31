package com.bfg.platform.auth.service;

import com.bfg.platform.gen.model.TokenResponse;

import java.util.UUID;

public interface AuthService {
    TokenResponse login(String username, String password);
    TokenResponse refresh(String refreshToken);
    void logout(UUID userId);
}


