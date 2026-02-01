package com.bfg.platform.bootstrap;

import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Secure one-time bootstrap to create the first APP_ADMIN user.
 * <p>
 * Enabled only when BOOTSTRAP_TOKEN is provided.
 * It will create the admin only if no existing APP_ADMIN exists.
 * <p>
 * Required environment variables:
 * <ul>
 *   <li>BOOTSTRAP_TOKEN (enables the runner)</li>
 *   <li>BOOTSTRAP_ADMIN_USERNAME</li>
 *   <li>BOOTSTRAP_ADMIN_PASSWORD</li>
 * </ul>
 * Optional environment variables:
 * <ul>
 *   <li>BOOTSTRAP_ADMIN_FIRST_NAME (default: App)</li>
 *   <li>BOOTSTRAP_ADMIN_LAST_NAME (default: Admin)</li>
 * </ul>
 * <p>
 * Also supported as Spring properties (useful for local profile):
 * <ul>
 *   <li>bfg.bootstrap.token</li>
 *   <li>bfg.bootstrap.admin.username</li>
 *   <li>bfg.bootstrap.admin.password</li>
 *   <li>bfg.bootstrap.admin.first-name</li>
 *   <li>bfg.bootstrap.admin.last-name</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BootstrapAdminRunner implements CommandLineRunner {

    private static final SystemRole ROLE_APP_ADMIN = SystemRole.APP_ADMIN;
    private static final String DEFAULT_FIRST_NAME = "App";
    private static final String DEFAULT_LAST_NAME = "Admin";
    private static final LocalDate DEFAULT_DATE_OF_BIRTH = LocalDate.of(1970, 1, 1);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) {
        String bootstrapToken = getProperty("bfg.bootstrap.token", "BOOTSTRAP_TOKEN");
        if (bootstrapToken == null || bootstrapToken.isBlank()) {
            log.debug("Bootstrap disabled: BOOTSTRAP_TOKEN not provided");
            return;
        }

        if (isAlreadyBootstrapped()) {
            log.debug("Bootstrap skipped: APP_ADMIN already exists");
            return;
        }

        String username = getProperty("bfg.bootstrap.admin.username", "BOOTSTRAP_ADMIN_USERNAME");
        String password = getProperty("bfg.bootstrap.admin.password", "BOOTSTRAP_ADMIN_PASSWORD");

        validateRequiredFields(username, password);

        if (userRepository.existsByUsername(username)) {
            throw new IllegalStateException(
                "Bootstrap failed: username '%s' already exists".formatted(username)
            );
        }

        String firstName = getOptionalProperty(
            "bfg.bootstrap.admin.first-name",
            "BOOTSTRAP_ADMIN_FIRST_NAME",
            DEFAULT_FIRST_NAME
        );
        String lastName = getOptionalProperty(
            "bfg.bootstrap.admin.last-name",
            "BOOTSTRAP_ADMIN_LAST_NAME",
            DEFAULT_LAST_NAME
        );
        String dobRaw = getOptionalProperty(
            "bfg.bootstrap.admin.date-of-birth",
            "BOOTSTRAP_ADMIN_DATE_OF_BIRTH",
            null
        );
        LocalDate dateOfBirth = parseDateOfBirth(dobRaw);

        UUID adminId = UUID.randomUUID();

        User admin = User.builder()
                .id(adminId)
                .firstName(firstName)
                .lastName(lastName)
                .dateOfBirth(dateOfBirth)
                .username(username)
                .password(passwordEncoder.encode(password))
                .isActive(true)
                .role(ROLE_APP_ADMIN)
                .build();

        entityManager.persist(admin);
        entityManager.flush();

        log.warn(
            "BOOTSTRAP: Created initial APP_ADMIN user with username='{}' (this should be used only for initial setup)",
            username
        );
    }

    private boolean isAlreadyBootstrapped() {
        return !userRepository.findByRole(ROLE_APP_ADMIN).isEmpty();
    }

    private void validateRequiredFields(String username, String password) {
        if (username == null || username.isBlank()) {
            throw new IllegalStateException(
                "Bootstrap failed: BOOTSTRAP_ADMIN_USERNAME is required"
            );
        }
        if (password == null || password.isBlank()) {
            throw new IllegalStateException(
                "Bootstrap failed: BOOTSTRAP_ADMIN_PASSWORD is required"
            );
        }
    }

    private String getProperty(String propertyKey, String envKey) {
        return firstNonBlank(
                environment.getProperty(propertyKey),
                System.getenv(envKey)
        );
    }

    private String getOptionalProperty(String propertyKey, String envKey, String defaultValue) {
        return Optional.ofNullable(getProperty(propertyKey, envKey))
                .filter(s -> !s.isBlank())
                .orElse(defaultValue);
    }

    private LocalDate parseDateOfBirth(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return DEFAULT_DATE_OF_BIRTH;
        }
        try {
            return LocalDate.parse(rawValue);
        } catch (Exception e) {
            throw new IllegalStateException(
                "Bootstrap failed: BOOTSTRAP_ADMIN_DATE_OF_BIRTH must be ISO-8601 (e.g., 1970-01-01)"
            );
        }
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        if (b != null && !b.isBlank()) {
            return b;
        }
        return null;
    }
}


