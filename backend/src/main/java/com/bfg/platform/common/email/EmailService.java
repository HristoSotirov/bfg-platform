package com.bfg.platform.common.email;

public interface EmailService {
    void sendPasswordResetEmail(String toEmail, String username, String resetToken);
}
