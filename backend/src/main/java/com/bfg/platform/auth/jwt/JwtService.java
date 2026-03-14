package com.bfg.platform.auth.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;

import java.util.UUID;

public interface JwtService {
    String CLAIM_ROLE = "role";
    String CLAIM_SCOPE_TYPE = "scopeType";
    String CLAIM_TYPE = "typ";
    String TYPE_ACCESS = "access";
    String TYPE_REFRESH = "refresh";

    String issueAccessToken(UUID userId, String role, String scopeType);
    String issueRefreshToken(UUID userId, String role, String scopeType);
    Jws<Claims> parseAndValidate(String jwt);
}


