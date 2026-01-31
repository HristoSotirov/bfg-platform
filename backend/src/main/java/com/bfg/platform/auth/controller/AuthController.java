package com.bfg.platform.auth.controller;

import com.bfg.platform.auth.service.AuthService;
import com.bfg.platform.gen.api.AuthApi;
import com.bfg.platform.gen.model.LoginRequest;
import com.bfg.platform.gen.model.RefreshRequest;
import com.bfg.platform.gen.model.TokenResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@AllArgsConstructor
public class AuthController implements AuthApi {
    private final AuthService authService;

    @Override
    public ResponseEntity<TokenResponse> login(LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest.getUsername(), loginRequest.getPassword()));
    }

    @Override
    public ResponseEntity<TokenResponse> refresh(RefreshRequest refreshRequest) {
        return ResponseEntity.ok(authService.refresh(refreshRequest.getRefreshToken()));
    }

    @Override
    public ResponseEntity<Void> logout() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UUID userId) {
            authService.logout(userId);
        }
        return ResponseEntity.noContent().build();
    }
}


