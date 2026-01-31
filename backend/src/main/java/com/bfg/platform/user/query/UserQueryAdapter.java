package com.bfg.platform.user.query;

import com.bfg.platform.common.query.FilterExpressionParser;
import com.bfg.platform.common.query.SortParser;
import com.bfg.platform.user.entity.User;
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

public final class UserQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "lastName"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("lastName_asc", new Sort.Order(Sort.Direction.ASC, "lastName")),
            Map.entry("lastName_desc", new Sort.Order(Sort.Direction.DESC, "lastName")),
            Map.entry("firstName_asc", new Sort.Order(Sort.Direction.ASC, "firstName")),
            Map.entry("firstName_desc", new Sort.Order(Sort.Direction.DESC, "firstName")),
            Map.entry("username_asc", new Sort.Order(Sort.Direction.ASC, "username")),
            Map.entry("username_desc", new Sort.Order(Sort.Direction.DESC, "username")),
            Map.entry("role_asc", new Sort.Order(Sort.Direction.ASC, "role")),
            Map.entry("role_desc", new Sort.Order(Sort.Direction.DESC, "role")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt"))
    );

    private UserQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<User> parseFilter(String filter) {
        return FilterExpressionParser.parse(filter, UserQueryAdapter::buildPredicate);
    }

    public static Sort parseSort(String orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    public static Specification<User> parseSearch(String search) {
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

    private static Predicate buildPredicate(Root<User> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "firstName", "lastName", "username", "role" -> stringPredicate(root, cb, field, op, valueRaw);
            case "isActive" -> booleanPredicate(root, cb, "isActive", op, valueRaw);
            case "status" -> booleanPredicate(root, cb, "isActive", op, valueRaw);
            case "createdAt", "modifiedAt" -> instantPredicate(root, cb, field, op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate stringPredicate(Root<User> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        String value = parseString(valueRaw);
        Expression<String> expr = cb.lower(root.get(field));
        String v = value.toLowerCase(Locale.ROOT);

        return switch (op) {
            case "eq" -> cb.equal(expr, v);
            case "ne" -> cb.notEqual(expr, v);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for field '" + field + "'");
        };
    }

    private static Predicate booleanPredicate(Root<User> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        Boolean b = parseBoolean(valueRaw);
        Expression<Boolean> expr = root.get(field);
        return switch (op) {
            case "eq" -> cb.equal(expr, b);
            case "ne" -> cb.notEqual(expr, b);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for boolean field '" + field + "'");
        };
    }

    private static Predicate instantPredicate(Root<User> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
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

    private static Predicate buildSearchPredicate(Root<User> root, CriteriaBuilder cb, String token) {
        String normalized = token.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        String likeValue = "%" + normalized.toLowerCase(Locale.ROOT) + "%";
        List<Predicate> fieldPredicates = new ArrayList<>();
        fieldPredicates.add(cb.like(cb.lower(root.get("firstName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("lastName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("username").as(String.class)), likeValue));
        return cb.or(fieldPredicates.toArray(new Predicate[0]));
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

    private static Boolean parseBoolean(String valueRaw) {
        String v = parseString(valueRaw).toLowerCase(Locale.ROOT);
        if ("true".equals(v)) return true;
        if ("false".equals(v)) return false;
        throw new IllegalArgumentException("Invalid boolean value: " + valueRaw);
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

