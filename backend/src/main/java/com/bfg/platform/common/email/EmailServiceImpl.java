package com.bfg.platform.common.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String frontendUrl;
    private final String fromEmail;
    private final String fromName;

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    public EmailServiceImpl(
            RestTemplate restTemplate,
            @Value("${bfg.brevo.api-key}") String apiKey,
            @Value("${bfg.password-reset.frontend-url}") String frontendUrl,
            @Value("${bfg.password-reset.from-email}") String fromEmail,
            @Value("${bfg.password-reset.from-name}") String fromName
    ) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
        this.frontendUrl = frontendUrl;
        this.fromEmail = fromEmail;
        this.fromName = fromName;
    }

    @Async
    @Override
    public void sendPasswordResetEmail(String toEmail, String username, String resetToken) {
        String resetUrl = frontendUrl + "/login?resetToken=" + resetToken;

        String html = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Нулиране на парола</h2>
                    <p>Здравейте,</p>
                    <p>Получихме заявка за нулиране на паролата за акаунт <strong>%s</strong>.</p>
                    <p>Натиснете бутона по-долу, за да зададете нова парола:</p>
                    <p style="margin: 24px 0;">
                        <a href="%s" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Нулирай паролата
                        </a>
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">Този линк е валиден 2 часа. Ако не сте заявили нулиране, игнорирайте този имейл.</p>
                </div>
                """.formatted(username, resetUrl);

        Map<String, Object> body = Map.of(
                "sender", Map.of("name", fromName, "email", fromEmail),
                "to", List.of(Map.of("email", toEmail)),
                "subject", "Нулиране на парола – БФГ Платформа",
                "htmlContent", html
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            log.info("Sending password reset email to {} for user {} via Brevo API", toEmail, username);
            restTemplate.postForEntity(BREVO_API_URL, request, String.class);
            log.info("Password reset email sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage(), e);
        }
    }
}
