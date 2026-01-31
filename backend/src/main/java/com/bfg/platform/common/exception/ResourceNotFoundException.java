package com.bfg.platform.common.exception;

import java.util.UUID;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, UUID uuid) {
        super(String.format("%s with UUID '%s' not found", resource, uuid));
    }
}

