package com.bfg.platform.auth.service;

import com.bfg.platform.auth.jwt.JwtService;
import com.bfg.platform.common.email.EmailService;
import com.bfg.platform.common.exception.UnauthorizedException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.i18n.MessageResolver;
import com.bfg.platform.gen.model.TokenResponse;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final MessageResolver messageResolver;
    private final long tokenTtlSeconds;

    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$"
    );

    public AuthServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            EmailService emailService,
            MessageResolver messageResolver,
            @Value("${bfg.password-reset.token-ttl-hours}") int tokenTtlHours
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.messageResolver = messageResolver;
        this.tokenTtlSeconds = tokenTtlHours * 3600L;
    }

    @Override
    @Transactional(readOnly = true)
    public TokenResponse login(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException(messageResolver.resolve("auth.invalidCredentials")));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException(messageResolver.resolve("auth.invalidCredentials"));
        }

        if (Boolean.FALSE.equals(user.isActive())) {
            throw new UnauthorizedException(messageResolver.resolve("auth.accountInactive"));
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
            throw new UnauthorizedException(messageResolver.resolve("auth.invalidRefreshToken"));
        }

        UUID userId = UUID.fromString(claims.getSubject());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException(messageResolver.resolve("auth.invalidRefreshToken")));

        if (Boolean.FALSE.equals(user.isActive())) {
            throw new UnauthorizedException(messageResolver.resolve("auth.accountInactive"));
        }

        String role = user.getRole().getValue();
        String access = jwtService.issueAccessToken(userId, role);
        String refresh = jwtService.issueRefreshToken(userId, role);
        return new TokenResponse(access, refresh, "Bearer");
    }

    @Override
    @Transactional
    public void logout(UUID userId) {
    }

    @Override
    @Transactional(readOnly = true)
    public void requestPasswordReset(String username) {
        userRepository.findByUsername(username).ifPresent(user -> {
            String token = jwtService.issuePasswordResetToken(user.getId(), tokenTtlSeconds);
            emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), token);
        });
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        Jws<Claims> jws;
        try {
            jws = jwtService.parseAndValidate(token);
        } catch (JwtException e) {
            throw new ValidationException(messageResolver.resolve("auth.invalidResetLink"));
        }

        Claims claims = jws.getPayload();
        String typ = claims.get(JwtService.CLAIM_TYPE, String.class);
        if (!JwtService.TYPE_PASSWORD_RESET.equals(typ)) {
            throw new ValidationException(messageResolver.resolve("auth.invalidResetLink"));
        }

        if (!PASSWORD_PATTERN.matcher(newPassword).matches()) {
            throw new ValidationException(messageResolver.resolve("auth.passwordRequirements"));
        }

        UUID userId = UUID.fromString(claims.getSubject());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ValidationException(messageResolver.resolve("auth.invalidResetLink")));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
