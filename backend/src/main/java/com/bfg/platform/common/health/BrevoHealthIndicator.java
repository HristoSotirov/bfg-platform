package com.bfg.platform.common.health;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

@Component
public class BrevoHealthIndicator implements HealthIndicator {

    private final RestTemplate restTemplate;
    private final String apiKey;

    public BrevoHealthIndicator(RestTemplate restTemplate, @Value("${bfg.brevo.api-key}") String apiKey) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
    }

    @Override
    public Health health() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("api-key", apiKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(
                "https://api.brevo.com/v3/account", HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                return Health.up().withDetail("service", "Brevo Email API").build();
            }
            return Health.down().withDetail("status", response.getStatusCode().value()).build();
        } catch (Exception e) {
            return Health.down().withDetail("error", e.getMessage()).build();
        }
    }
}
