package com.bfg.platform.common.exception;

/**
 * Thrown when authentication fails (invalid credentials / invalid token / inactive user).
 */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}


