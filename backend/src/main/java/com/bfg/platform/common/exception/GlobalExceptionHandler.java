package com.bfg.platform.common.exception;

import com.bfg.platform.gen.model.ErrorResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException ex) {
        return buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException ex) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex) {
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(ResourceCreationException.class)
    public ResponseEntity<ErrorResponse> handleCreationFailure(ResourceCreationException ex) {
        log.error("Resource creation failed", ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage());
    }

    @ExceptionHandler(ServiceException.class)
    public ResponseEntity<ErrorResponse> handleServiceError(ServiceException ex) {
        log.error("Service error", ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage());
    }

    @ExceptionHandler(PhotoUploadException.class)
    public ResponseEntity<ErrorResponse> handlePhotoUpload(PhotoUploadException ex) {
        log.error("Photo upload failed", ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .sorted((a, b) -> Integer.compare(validationPriority(a.getCode()), validationPriority(b.getCode())))
                .map(error -> error.getDefaultMessage())
                .findFirst()
                .orElse("Validation failed");
        return buildErrorResponse(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .sorted((a, b) -> Integer.compare(
                        validationPriority(a.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName()),
                        validationPriority(b.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName())
                ))
                .map(cv -> cv.getMessage())
                .findFirst()
                .orElse("Constraint violation");
        return buildErrorResponse(HttpStatus.BAD_REQUEST, message);
    }

    private int validationPriority(String code) {
        if (code == null) {
            return 100;
        }
        return switch (code) {
            case "NotBlank" -> 1;
            case "NotNull" -> 2;
            case "Size" -> 3;
            case "Email" -> 4;
            case "Pattern" -> 5;
            default -> 100;
        };
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation", ex);
        return buildErrorResponse(HttpStatus.CONFLICT, "Data integrity violation");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException ex) {
        // Usually malformed JSON (wrong quotes / stray characters / invalid types)
        log.warn("Malformed request body", ex);
        
        // Check if the cause is an IllegalArgumentException (e.g., invalid enum value)
        Throwable cause = ex.getCause();
        if (cause instanceof IllegalArgumentException) {
            return buildErrorResponse(HttpStatus.BAD_REQUEST, cause.getMessage());
        }
        
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Malformed JSON request body");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        // Bad query params/path vars (e.g. invalid UUID, invalid boolean, invalid enum)
        log.warn("Type mismatch", ex);
        String param = ex.getName();
        String value = ex.getValue() != null ? String.valueOf(ex.getValue()) : "null";
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid value for '" + param + "': " + value);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        // Used by our query parsers (filter/order), pageable validation, etc.
        log.warn("Bad request", ex);
        return buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal server error. Please try again later.");
    }

    private ResponseEntity<ErrorResponse> buildErrorResponse(HttpStatus status, String message) {
        ErrorResponse error = new ErrorResponse()
                .code(status.value())
                .message(message);
        return new ResponseEntity<>(error, status);
    }
}

