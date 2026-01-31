package com.bfg.platform.club.query;

import com.bfg.platform.club.entity.Club;
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
import java.util.UUID;

public final class ClubQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "name"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("name_asc", new Sort.Order(Sort.Direction.ASC, "name")),
            Map.entry("name_desc", new Sort.Order(Sort.Direction.DESC, "name")),
            Map.entry("shortName_asc", new Sort.Order(Sort.Direction.ASC, "shortName")),
            Map.entry("shortName_desc", new Sort.Order(Sort.Direction.DESC, "shortName")),
            Map.entry("isActive_asc", new Sort.Order(Sort.Direction.ASC, "isActive")),
            Map.entry("isActive_desc", new Sort.Order(Sort.Direction.DESC, "isActive")),
            Map.entry("cardPrefix_asc", new Sort.Order(Sort.Direction.ASC, "cardPrefix")),
            Map.entry("cardPrefix_desc", new Sort.Order(Sort.Direction.DESC, "cardPrefix")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt"))
    );

    private ClubQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<Club> parseFilter(String filter) {
        return FilterExpressionParser.parse(filter, ClubQueryAdapter::buildPredicate);
    }

    public static Sort parseSort(String orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    public static Specification<Club> parseSearch(String search) {
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

    private static Predicate buildPredicate(Root<Club> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "name", "shortName", "cardPrefix" -> stringPredicate(root, cb, field, op, valueRaw);
            case "isActive", "clubStatus" -> booleanPredicate(root, cb, "isActive", op, valueRaw);
            case "createdAt", "modifiedAt" -> instantPredicate(root, cb, field, op, valueRaw);
            case "clubAdminId" -> uuidPredicate(root, cb, "clubAdmin", op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate buildSearchPredicate(Root<Club> root, CriteriaBuilder cb, String token) {
        String normalized = token.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        String likeValue = "%" + normalized.toLowerCase(Locale.ROOT) + "%";
        List<Predicate> fieldPredicates = new ArrayList<>();
        fieldPredicates.add(cb.like(cb.lower(root.get("name")), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("shortName")), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("cardPrefix")), likeValue));
        return cb.or(fieldPredicates.toArray(new Predicate[0]));
    }

    private static Predicate booleanPredicate(Root<Club> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        Boolean value = parseBoolean(valueRaw);
        Expression<Boolean> expr = root.get(field);
        return switch (op) {
            case "eq" -> cb.equal(expr, value);
            case "ne" -> cb.notEqual(expr, value);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for boolean field '" + field + "'");
        };
    }

    private static Boolean parseBoolean(String valueRaw) {
        String v = parseString(valueRaw).toLowerCase(Locale.ROOT);
        return switch (v) {
            case "true", "1", "yes", "on" -> true;
            case "false", "0", "no", "off" -> false;
            default -> throw new IllegalArgumentException("Invalid boolean value: " + valueRaw);
        };
    }

    private static Predicate stringPredicate(Root<Club> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        String value = parseString(valueRaw);
        Expression<String> expr = cb.lower(root.get(field));
        String v = value.toLowerCase(Locale.ROOT);

        return switch (op) {
            case "eq" -> cb.equal(expr, v);
            case "ne" -> cb.notEqual(expr, v);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for field '" + field + "'");
        };
    }

    private static Predicate uuidPredicate(Root<Club> root, CriteriaBuilder cb, String entityField, String op, String valueRaw) {
        UUID uuid = parseUuid(valueRaw);
        Expression<UUID> expr = root.get(entityField);
        return switch (op) {
            case "eq" -> cb.equal(expr, uuid);
            case "ne" -> cb.notEqual(expr, uuid);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for UUID field '" + entityField + "'");
        };
    }

    private static Predicate instantPredicate(Root<Club> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
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

    private static UUID parseUuid(String valueRaw) {
        String v = parseString(valueRaw);
        try {
            return UUID.fromString(v);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid UUID value: " + valueRaw);
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

