package com.bfg.platform.athlete.query;

import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.common.query.FilterExpressionParser;
import com.bfg.platform.common.query.SortParser;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class AthleteQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "lastName"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("lastName_asc", new Sort.Order(Sort.Direction.ASC, "lastName")),
            Map.entry("lastName_desc", new Sort.Order(Sort.Direction.DESC, "lastName")),
            Map.entry("firstName_asc", new Sort.Order(Sort.Direction.ASC, "firstName")),
            Map.entry("firstName_desc", new Sort.Order(Sort.Direction.DESC, "firstName")),
            Map.entry("dateOfBirth_asc", new Sort.Order(Sort.Direction.ASC, "dateOfBirth")),
            Map.entry("dateOfBirth_desc", new Sort.Order(Sort.Direction.DESC, "dateOfBirth")),
            Map.entry("registeredOn_asc", new Sort.Order(Sort.Direction.ASC, "registeredOn")),
            Map.entry("registeredOn_desc", new Sort.Order(Sort.Direction.DESC, "registeredOn"))
    );

    private AthleteQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<Athlete> parseFilter(String filter) {
        return FilterExpressionParser.parse(filter, AthleteQueryAdapter::buildPredicate);
    }

    public static Sort parseSort(String orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    public static Specification<Athlete> parseSearch(String search) {
        if (search == null || search.isBlank()) {
            return Specification.where(null);
        }
        List<String> tokens = tokenize(search);
        if (tokens.isEmpty()) {
            return Specification.where(null);
        }
        return (root, query, cb) -> {
            List<Predicate> tokenPredicates = new ArrayList<>();
            for (String token : tokens) {
                Predicate predicate = buildSearchPredicate(root, cb, token);
                if (predicate != null) {
                    tokenPredicates.add(predicate);
                }
            }
            if (tokenPredicates.isEmpty()) {
                return cb.conjunction();
            }
            return cb.and(tokenPredicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate buildPredicate(Root<Athlete> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "firstName", "middleName", "lastName", "gender" -> stringPredicate(root, cb, field, op, valueRaw);
            case "dateOfBirth", "medicalExaminationDue", "insuranceFrom", "insuranceTo" -> datePredicate(root, cb, field, op, valueRaw);
            case "registeredOn" -> instantPredicate(root, cb, "registeredOn", op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate buildSearchPredicate(Root<Athlete> root, CriteriaBuilder cb, String token) {
        String normalized = token.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        String likeValue = "%" + normalized.toLowerCase(Locale.ROOT) + "%";
        List<Predicate> fieldPredicates = new ArrayList<>();
        fieldPredicates.add(cb.like(cb.lower(root.get("firstName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("middleName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("lastName").as(String.class)), likeValue));
        LocalDate date = tryParseDate(normalized);
        if (date != null) {
            fieldPredicates.add(cb.equal(root.get("dateOfBirth"), date));
        }
        return cb.or(fieldPredicates.toArray(new Predicate[0]));
    }

    private static Predicate stringPredicate(Root<Athlete> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        String value = parseString(valueRaw);
        Expression<String> expr = cb.lower(root.get(field).as(String.class));
        String v = value.toLowerCase(Locale.ROOT);

        return switch (op) {
            case "eq" -> cb.equal(expr, v);
            case "ne" -> cb.notEqual(expr, v);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for field '" + field + "'");
        };
    }

    private static Predicate datePredicate(Root<Athlete> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        LocalDate d = parseLocalDate(valueRaw);
        Expression<LocalDate> expr = root.get(field);
        return switch (op) {
            case "eq" -> cb.equal(expr, d);
            case "ne" -> cb.notEqual(expr, d);
            case "gt" -> cb.greaterThan(expr, d);
            case "ge" -> cb.greaterThanOrEqualTo(expr, d);
            case "lt" -> cb.lessThan(expr, d);
            case "le" -> cb.lessThanOrEqualTo(expr, d);
            default -> throw new IllegalArgumentException("Unsupported operator: " + op);
        };
    }

    private static Predicate instantPredicate(Root<Athlete> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        Instant instant = parseInstant(valueRaw);
        Expression<Instant> expr = root.get(field);
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

    private static String parseString(String valueRaw) {
        String v = valueRaw.trim();
        if (v.startsWith("'") && v.endsWith("'") && v.length() >= 2) {
            v = v.substring(1, v.length() - 1);
        }
        v = v.replace("\\'", "'");
        return v;
    }

    private static List<String> tokenize(String search) {
        String[] rawTokens = search.trim().split("\\s+");
        List<String> tokens = new ArrayList<>();
        for (String token : rawTokens) {
            if (!token.isBlank()) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    private static LocalDate parseLocalDate(String valueRaw) {
        String v = parseString(valueRaw);
        try {
            return LocalDate.parse(v);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid date value: " + valueRaw);
        }
    }

    private static LocalDate tryParseDate(String token) {
        try {
            return LocalDate.parse(token);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static Instant parseInstant(String valueRaw) {
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
}

