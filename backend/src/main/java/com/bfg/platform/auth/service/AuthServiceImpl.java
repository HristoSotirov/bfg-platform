package com.bfg.platform.auth.service;

import com.bfg.platform.auth.jwt.JwtService;
import com.bfg.platform.common.exception.UnauthorizedException;
import com.bfg.platform.gen.model.TokenResponse;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@AllArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    @Transactional(readOnly = true)
    public TokenResponse login(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid username or password");
        }

        if (Boolean.FALSE.equals(user.isActive())) {
            throw new UnauthorizedException("Account is inactive");
        }

        String role = user.getRole().getValue();
        String access = jwtService.issueAccessToken(user.getId(), role);
        String refresh = jwtService.issueRefreshToken(user.getId(), role);
        return new TokenResponse(access, refresh, "Bearer");
    }

    @Override
    @Transactional(readOnly = true)
    public TokenResponse refresh(String refreshToken) {
        Jws<Claims> jws = jwtService.parseAndValidate(refreshToken);
        Claims claims = jws.getPayload();

        String typ = claims.get(JwtService.CLAIM_TYPE, String.class);
        if (!JwtService.TYPE_REFRESH.equals(typ)) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        UUID userId = UUID.fromString(claims.getSubject());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (Boolean.FALSE.equals(user.isActive())) {
            throw new UnauthorizedException("Account is inactive");
        }

        String role = user.getRole().getValue();
        String access = jwtService.issueAccessToken(userId, role);
        String refresh = jwtService.issueRefreshToken(userId, role);
        return new TokenResponse(access, refresh, "Bearer");
    }

    @Override
    @Transactional
    public void logout(UUID userId) {
        // Stateless logout: we don't store refresh tokens server-side.
        // Client should discard access/refresh tokens.
        // If you need immediate token revocation, re-introduce token_version or persist refresh tokens.
    }
}

