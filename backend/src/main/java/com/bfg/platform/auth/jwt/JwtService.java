package com.bfg.platform.auth.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;

import java.util.UUID;

public interface JwtService {
    String CLAIM_ROLE = "role";
    String CLAIM_TYPE = "typ";
    String TYPE_ACCESS = "access";
    String TYPE_REFRESH = "refresh";

    String issueAccessToken(UUID userId, String role);
    String issueRefreshToken(UUID userId, String role);
    Jws<Claims> parseAndValidate(String jwt);
}


