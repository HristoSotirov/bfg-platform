package com.bfg.platform.common.security;

import com.bfg.platform.gen.model.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        if (response.isCommitted()) {
            return;
        }

        String message = "Unauthorized";
        if (authException instanceof InsufficientAuthenticationException) {
            message = "Missing bearer token";
        } else if (authException.getMessage() != null && !authException.getMessage().isBlank()) {
            // For invalid/expired tokens we pass a specific message from the JWT filter
            message = authException.getMessage();
        }

        ErrorResponse body = new ErrorResponse()
                .code(HttpServletResponse.SC_UNAUTHORIZED)
                .message(message);

        response.resetBuffer();
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), body);
        response.flushBuffer();
    }
}


