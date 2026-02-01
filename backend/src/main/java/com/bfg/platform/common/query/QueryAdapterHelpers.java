package com.bfg.platform.common.query;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Common helper methods for query adapters.
 * Contains shared parsing and predicate building logic to reduce code duplication.
 */
public final class QueryAdapterHelpers {
    
    private QueryAdapterHelpers() {
        throw new IllegalStateException("Utility class");
    }
    
    // ==================== Parsing Methods ====================
    
    /**
     * Parse a string value, removing quotes if present.
     */
    public static String parseString(String valueRaw) {
        String v = valueRaw.trim();
        if (v.startsWith("'") && v.endsWith("'") && v.length() >= 2) {
            v = v.substring(1, v.length() - 1);
        }
        v = v.replace("\\'", "'");
        return v;
    }
    
    /**
     * Parse a UUID value.
     */
    public static UUID parseUuid(String valueRaw) {
        String v = parseString(valueRaw);
        try {
            return UUID.fromString(v);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid UUID value: " + valueRaw);
        }
    }
    
    /**
     * Parse an integer value.
     */
    public static Integer parseInteger(String valueRaw) {
        String v = parseString(valueRaw);
        try {
            return Integer.parseInt(v);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid integer value: " + valueRaw);
        }
    }
    
    /**
     * Parse a LocalDate value.
     */
    public static LocalDate parseLocalDate(String valueRaw) {
        String v = parseString(valueRaw);
        try {
            return LocalDate.parse(v);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid date value: " + valueRaw);
        }
    }
    
    /**
     * Parse an Instant value. Supports ISO-8601, LocalDate, and OffsetDateTime formats.
     */
    public static Instant parseInstant(String valueRaw) {
        String v = parseString(valueRaw);
        try {
            return Instant.parse(v);
        } catch (DateTimeParseException ignored) {
        }
        try {
            LocalDate d = LocalDate.parse(v);
            return d.atStartOfDay().toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ignored) {
        }
        try {
            return OffsetDateTime.parse(v).toInstant();
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid date-time value: " + valueRaw);
        }
    }
    
    /**
     * Parse a boolean value. Supports: true/false, 1/0, yes/no, on/off.
     */
    public static Boolean parseBoolean(String valueRaw) {
        String v = parseString(valueRaw).toLowerCase(Locale.ROOT);
        return switch (v) {
            case "true", "1", "yes", "on" -> true;
            case "false", "0", "no", "off" -> false;
            default -> throw new IllegalArgumentException("Invalid boolean value: " + valueRaw);
        };
    }
    
    // ==================== Tokenization Methods ====================
    
    /**
     * Tokenize a search string by whitespace.
     */
    public static List<String> tokenize(String search) {
        String[] rawTokens = search.trim().split("\\s+");
        List<String> tokens = new ArrayList<>();
        for (String token : rawTokens) {
            if (!token.isBlank()) {
                tokens.add(token);
            }
        }
        return tokens;
    }
    
    /**
     * Try to parse a token as a LocalDate. Returns null if parsing fails.
     */
    public static LocalDate tryParseDate(String token) {
        try {
            return LocalDate.parse(token);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
    
    // ==================== Predicate Builders ====================
    
    /**
     * Build a string predicate (case-insensitive).
     */
    public static <T> Predicate stringPredicate(Path<T> path, CriteriaBuilder cb, String field, String op, String valueRaw) {
        String value = parseString(valueRaw);
        Expression<String> expr = cb.lower(path.get(field).as(String.class));
        String v = value.toLowerCase(Locale.ROOT);
        
        return switch (op) {
            case "eq" -> cb.equal(expr, v);
            case "ne" -> cb.notEqual(expr, v);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for string field '" + field + "'");
        };
    }
    
    /**
     * Build a UUID predicate.
     */
    public static <T> Predicate uuidPredicate(Path<T> path, CriteriaBuilder cb, String field, String op, String valueRaw) {
        UUID uuid = parseUuid(valueRaw);
        Expression<UUID> expr = path.get(field).as(UUID.class);
        
        return switch (op) {
            case "eq" -> cb.equal(expr, uuid);
            case "ne" -> cb.notEqual(expr, uuid);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for UUID field '" + field + "'");
        };
    }
    
    /**
     * Build a date (LocalDate) predicate.
     */
    public static <T> Predicate datePredicate(Path<T> path, CriteriaBuilder cb, String field, String op, String valueRaw) {
        LocalDate date = parseLocalDate(valueRaw);
        Expression<LocalDate> expr = path.get(field).as(LocalDate.class);
        
        return switch (op) {
            case "eq" -> cb.equal(expr, date);
            case "ne" -> cb.notEqual(expr, date);
            case "gt" -> cb.greaterThan(expr, date);
            case "ge" -> cb.greaterThanOrEqualTo(expr, date);
            case "lt" -> cb.lessThan(expr, date);
            case "le" -> cb.lessThanOrEqualTo(expr, date);
            default -> throw new IllegalArgumentException("Unsupported operator: " + op);
        };
    }
    
    /**
     * Build an instant (Instant) predicate.
     */
    public static <T> Predicate instantPredicate(Path<T> path, CriteriaBuilder cb, String field, String op, String valueRaw) {
        Instant instant = parseInstant(valueRaw);
        Expression<Instant> expr = path.get(field).as(Instant.class);
        
        return switch (op) {
            case "eq" -> cb.equal(expr, instant);
            case "ne" -> cb.notEqual(expr, instant);
            case "gt" -> cb.greaterThan(expr, instant);
            case "ge" -> cb.greaterThanOrEqualTo(expr, instant);
            case "lt" -> cb.lessThan(expr, instant);
            case "le" -> cb.lessThanOrEqualTo(expr, instant);
            default -> throw new IllegalArgumentException("Unsupported operator: " + op);
        };
    }
    
    /**
     * Build an integer predicate.
     */
    public static <T> Predicate integerPredicate(Path<T> path, CriteriaBuilder cb, String field, String op, String valueRaw) {
        Integer value = parseInteger(valueRaw);
        Expression<Integer> expr = path.get(field).as(Integer.class);
        
        return switch (op) {
            case "eq" -> cb.equal(expr, value);
            case "ne" -> cb.notEqual(expr, value);
            case "gt" -> cb.greaterThan(expr, value);
            case "ge" -> cb.greaterThanOrEqualTo(expr, value);
            case "lt" -> cb.lessThan(expr, value);
            case "le" -> cb.lessThanOrEqualTo(expr, value);
            default -> throw new IllegalArgumentException("Unsupported operator: " + op);
        };
    }
    
    /**
     * Build a boolean predicate.
     */
    public static <T> Predicate booleanPredicate(Path<T> path, CriteriaBuilder cb, String field, String op, String valueRaw) {
        Boolean boolValue = parseBoolean(valueRaw);
        Expression<Boolean> expr = path.get(field).as(Boolean.class);
        
        return switch (op) {
            case "eq" -> cb.equal(expr, boolValue);
            case "ne" -> cb.notEqual(expr, boolValue);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for boolean field '" + field + "'");
        };
    }
    
    // ==================== Range Predicates ====================
    
    /**
     * Build a date range predicate.
     */
    public static <T> Predicate dateRangePredicate(Path<T> path, CriteriaBuilder cb, String field, String minValue, String maxValue) {
        Expression<LocalDate> expr = path.get(field).as(LocalDate.class);
        List<Predicate> predicates = new ArrayList<>();
        
        if (minValue != null && !minValue.isEmpty()) {
            LocalDate minDate = parseLocalDate(minValue);
            predicates.add(cb.greaterThanOrEqualTo(expr, minDate));
        }
        if (maxValue != null && !maxValue.isEmpty()) {
            LocalDate maxDate = parseLocalDate(maxValue);
            predicates.add(cb.lessThanOrEqualTo(expr, maxDate));
        }
        
        if (predicates.isEmpty()) {
            return cb.conjunction();
        }
        return cb.and(predicates.toArray(new Predicate[0]));
    }
    
    /**
     * Build an integer range predicate.
     */
    public static <T> Predicate integerRangePredicate(Path<T> path, CriteriaBuilder cb, String field, String minValue, String maxValue) {
        Expression<Integer> expr = path.get(field).as(Integer.class);
        List<Predicate> predicates = new ArrayList<>();
        
        if (minValue != null && !minValue.isEmpty()) {
            Integer min = parseInteger(minValue);
            predicates.add(cb.greaterThanOrEqualTo(expr, min));
        }
        if (maxValue != null && !maxValue.isEmpty()) {
            Integer max = parseInteger(maxValue);
            predicates.add(cb.lessThanOrEqualTo(expr, max));
        }
        
        if (predicates.isEmpty()) {
            return cb.conjunction();
        }
        return cb.and(predicates.toArray(new Predicate[0]));
    }
    
    /**
     * Build an instant range predicate.
     */
    public static <T> Predicate instantRangePredicate(Path<T> path, CriteriaBuilder cb, String field, String minValue, String maxValue) {
        Expression<Instant> expr = path.get(field).as(Instant.class);
        List<Predicate> predicates = new ArrayList<>();
        
        if (minValue != null && !minValue.isEmpty()) {
            Instant min = parseInstant(minValue);
            predicates.add(cb.greaterThanOrEqualTo(expr, min));
        }
        if (maxValue != null && !maxValue.isEmpty()) {
            Instant max = parseInstant(maxValue);
            predicates.add(cb.lessThanOrEqualTo(expr, max));
        }
        
        if (predicates.isEmpty()) {
            return cb.conjunction();
        }
        return cb.and(predicates.toArray(new Predicate[0]));
    }
    
    // ==================== In Predicates ====================
    
    /**
     * Build a string in predicate (case-insensitive).
     */
    public static <T> Predicate stringInPredicate(Path<T> path, CriteriaBuilder cb, String field, List<String> values) {
        Expression<String> expr = cb.lower(path.get(field).as(String.class));
        List<Predicate> predicates = new ArrayList<>();
        for (String value : values) {
            String v = parseString(value).toLowerCase(Locale.ROOT);
            predicates.add(cb.equal(expr, v));
        }
        return cb.or(predicates.toArray(new Predicate[0]));
    }
    
    /**
     * Build a UUID in predicate.
     */
    public static <T> Predicate uuidInPredicate(Path<T> path, CriteriaBuilder cb, String field, List<String> values) {
        Expression<UUID> expr = path.get(field).as(UUID.class);
        List<Predicate> predicates = new ArrayList<>();
        for (String value : values) {
            UUID uuid = parseUuid(value);
            predicates.add(cb.equal(expr, uuid));
        }
        return cb.or(predicates.toArray(new Predicate[0]));
    }
    
    /**
     * Build an integer in predicate.
     */
    public static <T> Predicate integerInPredicate(Path<T> path, CriteriaBuilder cb, String field, List<String> values) {
        Expression<Integer> expr = path.get(field).as(Integer.class);
        List<Predicate> predicates = new ArrayList<>();
        for (String value : values) {
            Integer intValue = parseInteger(value);
            predicates.add(cb.equal(expr, intValue));
        }
        return cb.or(predicates.toArray(new Predicate[0]));
    }
    
    /**
     * Build a boolean in predicate.
     */
    public static <T> Predicate booleanInPredicate(Path<T> path, CriteriaBuilder cb, String field, List<String> values) {
        Expression<Boolean> expr = path.get(field).as(Boolean.class);
        List<Predicate> predicates = new ArrayList<>();
        for (String value : values) {
            Boolean boolValue = parseBoolean(value);
            predicates.add(cb.equal(expr, boolValue));
        }
        return cb.or(predicates.toArray(new Predicate[0]));
    }
}

