package com.bfg.platform.auth.security;

import com.bfg.platform.auth.jwt.JwtService;
import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final com.bfg.platform.user.repository.UserRepository userRepository;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            com.bfg.platform.user.repository.UserRepository userRepository,
            AuthenticationEntryPoint authenticationEntryPoint
    ) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() != null &&
            SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring("Bearer ".length()).trim();
        try {
            Jws<Claims> jws = jwtService.parseAndValidate(token);
            Claims claims = jws.getPayload();

            String typ = claims.get(JwtService.CLAIM_TYPE, String.class);
            if (!JwtService.TYPE_ACCESS.equals(typ)) {
                filterChain.doFilter(request, response);
                return;
            }

            UUID userId = UUID.fromString(claims.getSubject());
            String role = claims.get(JwtService.CLAIM_ROLE, String.class);
            String scopeTypeStr = claims.get(JwtService.CLAIM_SCOPE_TYPE, String.class);
            ScopeType scopeType = (scopeTypeStr != null && !scopeTypeStr.isBlank())
                    ? ScopeType.fromValue(scopeTypeStr)
                    : ScopeType.INTERNAL;

            User user = userRepository.findById(userId).orElse(null);
            if (user == null || Boolean.FALSE.equals(user.isActive())) {
                SecurityContextHolder.clearContext();
                authenticationEntryPoint.commence(
                        request,
                        response,
                        new BadCredentialsException("User is inactive or does not exist")
                );
                return;
            }

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    role != null ? List.of(new SimpleGrantedAuthority(role)) : List.of()
            );
            authentication.setDetails(Map.of("scopeType", scopeType));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (ExpiredJwtException e) {
            SecurityContextHolder.clearContext();
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new BadCredentialsException("Bearer token expired")
            );
            return;
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new BadCredentialsException("Invalid bearer token")
            );
            return;
        }

        filterChain.doFilter(request, response);
    }
}


