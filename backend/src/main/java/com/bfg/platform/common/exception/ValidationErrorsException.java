package com.bfg.platform.common.exception;

import java.util.List;

public class ValidationErrorsException extends RuntimeException {

    private final List<String> errors;

    public ValidationErrorsException(List<String> errors) {
        super("Validation failed with " + errors.size() + " error(s)");
        this.errors = List.copyOf(errors);
    }

    public List<String> getErrors() {
        return errors;
    }
}
