package com.bfg.platform.auth.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.springframework.stereotype.Service;

import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtServiceImpl implements JwtService {
    private final JwtProperties properties;
    private final PrivateKey privateKey;
    private final PublicKey publicKey;

    public JwtServiceImpl(JwtProperties properties) {
        this.properties = properties;
        // Keys are already validated and initialized in JwtProperties
        this.privateKey = properties.getPrivateKey();
        this.publicKey = properties.getPublicKey();
    }

    @Override
    public String issueAccessToken(UUID userId, String role) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(properties.getAccessTokenTtlSeconds());
        var builder = Jwts.builder()
                .issuer(properties.getIssuer())
                .subject(userId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claim(CLAIM_ROLE, role)
                .claim(CLAIM_TYPE, TYPE_ACCESS);
        if (properties.getAudience() != null && !properties.getAudience().isBlank()) {
            builder.audience().add(properties.getAudience()).and();
        }
        return builder.signWith(privateKey).compact();
    }

    @Override
    public String issueRefreshToken(UUID userId, String role) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(properties.getRefreshTokenTtlSeconds());
        var builder = Jwts.builder()
                .issuer(properties.getIssuer())
                .subject(userId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claim(CLAIM_ROLE, role)
                .claim(CLAIM_TYPE, TYPE_REFRESH);
        if (properties.getAudience() != null && !properties.getAudience().isBlank()) {
            builder.audience().add(properties.getAudience()).and();
        }
        return builder.signWith(privateKey).compact();
    }

    @Override
    public Jws<Claims> parseAndValidate(String jwt) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(jwt);

        Claims claims = jws.getPayload();
        String issuer = claims.getIssuer();
        if (issuer == null || !issuer.equals(properties.getIssuer())) {
            throw new JwtException("Invalid issuer");
        }

        String expectedAudience = properties.getAudience();
        if (expectedAudience != null && !expectedAudience.isBlank()) {
            Object audience = claims.getAudience();
            boolean matched = false;
            if (audience instanceof String audString) {
                matched = expectedAudience.equals(audString);
            } else if (audience instanceof Collection<?> audCollection) {
                matched = audCollection.contains(expectedAudience);
            }
            if (!matched) {
                throw new JwtException("Invalid audience");
            }
        }

        return jws;
    }
}

