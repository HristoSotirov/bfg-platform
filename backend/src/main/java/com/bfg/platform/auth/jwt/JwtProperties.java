package com.bfg.platform.auth.jwt;

import jakarta.annotation.PostConstruct;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;

/**
 * Configuration properties for JWT token management.
 * <p>
 * Validates required properties and initializes RSA keys for token signing and verification.
 * Supports both configured keys (via PEM strings) and ephemeral key generation for development.
 */
@Component
@Slf4j
@Getter
@Setter
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

    private static final String RSA_ALGORITHM = "RSA";
    private static final int RSA_KEY_SIZE = 2048;

    private String issuer;
    private String audience;
    private long accessTokenTtlSeconds;
    private long refreshTokenTtlSeconds;
    private String privateKeyPem;
    private String publicKeyPem;
    private Boolean allowEphemeralKeys;

    @Setter(AccessLevel.PRIVATE)
    private PrivateKey privateKey;

    @Setter(AccessLevel.PRIVATE)
    private PublicKey publicKey;

    /**
     * Validates all JWT configuration properties and initializes keys.
     * This method is called automatically after all properties are bound.
     *
     * @throws IllegalStateException if configuration is invalid
     */
    @PostConstruct
    public void validateAndInitialize() {
        validateIssuer();
        validateTtlProperties();
        initializeKeys();
    }

    private void validateIssuer() {
        if (!isNotBlank(issuer)) {
            throw new IllegalStateException(
                "Required property 'jwt.issuer' (JWT_ISSUER) is missing or blank. " +
                "Please set this property in your configuration file or environment variable."
            );
        }
    }

    private void validateTtlProperties() {
        if (accessTokenTtlSeconds <= 0) {
            throw new IllegalStateException(
                "Required property 'jwt.access-token-ttl-seconds' (JWT_ACCESS_TTL_SECONDS) is missing or invalid. " +
                "It must be set and greater than 0. Please set this property in your configuration file or environment variable."
            );
        }

        if (refreshTokenTtlSeconds <= 0) {
            throw new IllegalStateException(
                "Required property 'jwt.refresh-token-ttl-seconds' (JWT_REFRESH_TTL_SECONDS) is missing or invalid. " +
                "It must be set and greater than 0. Please set this property in your configuration file or environment variable."
            );
        }
    }

    private void initializeKeys() {
        boolean hasPrivateKey = isNotBlank(privateKeyPem);
        boolean hasPublicKey = isNotBlank(publicKeyPem);

        if (hasPrivateKey && hasPublicKey) {
            loadConfiguredKeys();
            return;
        }

        if (hasPrivateKey != hasPublicKey) {
            throw new IllegalStateException(
                "Both jwt.private-key-pem and jwt.public-key-pem (JWT_PRIVATE_KEY_PEM and JWT_PUBLIC_KEY_PEM) " +
                "must be provided together, or both must be omitted to use ephemeral keys " +
                "(if allow-ephemeral-keys is true)."
            );
        }

        if (allowEphemeralKeys == null || !allowEphemeralKeys) {
            throw new IllegalStateException(
                "JWT keys are required but not provided. " +
                "Please set jwt.private-key-pem and jwt.public-key-pem (JWT_PRIVATE_KEY_PEM and JWT_PUBLIC_KEY_PEM), " +
                "or set jwt.allow-ephemeral-keys to true for local development."
            );
        }

        generateEphemeralKeys();
    }

    private void loadConfiguredKeys() {
        try {
            this.privateKey = RsaKeyLoader.loadPrivateKeyFromPem(privateKeyPem);
            this.publicKey = RsaKeyLoader.loadPublicKeyFromPem(publicKeyPem);
            log.info("JWT RSA keys loaded successfully from configuration");
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                "Failed to load JWT keys from PEM format. " +
                "Please verify that jwt.private-key-pem and jwt.public-key-pem are valid RSA keys.",
                e
            );
        }
    }

    private void generateEphemeralKeys() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance(RSA_ALGORITHM);
            generator.initialize(RSA_KEY_SIZE);
            KeyPair keyPair = generator.generateKeyPair();
            this.privateKey = keyPair.getPrivate();
            this.publicKey = keyPair.getPublic();

            log.warn(
                "JWT RSA keys are not configured. Generated ephemeral keys for this startup. " +
                "Tokens will be invalid after restart. " +
                "Set JWT_PRIVATE_KEY_PEM and JWT_PUBLIC_KEY_PEM for stable keys."
            );
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                "Failed to generate ephemeral RSA keypair: RSA algorithm not available",
                e
            );
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate ephemeral RSA keypair", e);
        }
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }
}


