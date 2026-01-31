package com.bfg.platform.athlete.query;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.club.entity.Club;
import com.bfg.platform.common.query.FilterExpressionParser;
import com.bfg.platform.common.query.SortParser;
import com.bfg.platform.gen.model.AccreditationStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public final class AccreditationQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.DESC, "year"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("year_asc", new Sort.Order(Sort.Direction.ASC, "year")),
            Map.entry("year_desc", new Sort.Order(Sort.Direction.DESC, "year")),
            Map.entry("accreditationNumber_asc", new Sort.Order(Sort.Direction.ASC, "accreditationNumber")),
            Map.entry("accreditationNumber_desc", new Sort.Order(Sort.Direction.DESC, "accreditationNumber")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt"))
    );

    private AccreditationQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<Accreditation> parseFilter(String filter) {
        return FilterExpressionParser.parse(filter, AccreditationQueryAdapter::buildPredicate);
    }

    public static Sort parseSort(String orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    public static Specification<Accreditation> parseSearch(String search) {
        if (search == null || search.isBlank()) {
            return Specification.where(null);
        }
        List<String> tokens = tokenize(search);
        if (tokens.isEmpty()) {
            return Specification.where(null);
        }
        return (root, query, cb) -> {
            query.distinct(true);
            Join<Accreditation, Athlete> athleteJoin = root.join("athlete", JoinType.LEFT);
            Join<Accreditation, Club> clubJoin = root.join("club", JoinType.LEFT);
            List<Predicate> tokenPredicates = new ArrayList<>();
            for (String token : tokens) {
                Predicate predicate = buildSearchPredicate(root, athleteJoin, clubJoin, cb, token);
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

    private static Predicate buildPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "athleteId" -> uuidPredicate(root, cb, "athleteId", op, valueRaw);
            case "clubId" -> uuidPredicate(root, cb, "clubId", op, valueRaw);
            case "year", "accreditationYear" -> integerPredicate(root, cb, "year", op, valueRaw);
            case "status", "accreditationStatus" -> enumPredicate(root, cb, "status", op, valueRaw);
            case "accreditationNumber" -> stringPredicate(root, cb, "accreditationNumber", op, valueRaw);
            case "createdAt" -> instantPredicate(root, cb, "createdAt", op, valueRaw);
            case "dateOfBirth", "athleteDateOfBirth" -> athleteDatePredicate(root, cb, op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate buildSearchPredicate(
            Root<Accreditation> root,
            Join<Accreditation, Athlete> athleteJoin,
            Join<Accreditation, Club> clubJoin,
            CriteriaBuilder cb,
            String token
    ) {
        String normalized = token.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        String likeValue = "%" + normalized.toLowerCase(Locale.ROOT) + "%";
        List<Predicate> fieldPredicates = new ArrayList<>();
        fieldPredicates.add(cb.like(cb.lower(athleteJoin.get("firstName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(athleteJoin.get("middleName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(athleteJoin.get("lastName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(clubJoin.get("name").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("accreditationNumber").as(String.class)), likeValue));
        LocalDate date = tryParseDate(normalized);
        if (date != null) {
            fieldPredicates.add(cb.equal(athleteJoin.get("dateOfBirth"), date));
        }
        return cb.or(fieldPredicates.toArray(new Predicate[0]));
    }

    private static Predicate stringPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        String value = parseString(valueRaw);
        Expression<String> expr = cb.lower(root.get(field).as(String.class));
        String v = value.toLowerCase(Locale.ROOT);

        return switch (op) {
            case "eq" -> cb.equal(expr, v);
            case "ne" -> cb.notEqual(expr, v);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for field '" + field + "'");
        };
    }

    private static Predicate enumPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        String value = parseString(valueRaw);
        AccreditationStatus status;
        try {
            status = AccreditationStatus.fromValue(value);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid accreditation status value: " + valueRaw);
        }
        Expression<AccreditationStatus> expr = root.get(field);

        return switch (op) {
            case "eq" -> cb.equal(expr, status);
            case "ne" -> cb.notEqual(expr, status);
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for field '" + field + "'");
        };
    }

    private static Predicate uuidPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (op) {
            case "eq" -> {
                UUID uuid = parseUuid(valueRaw);
                Expression<UUID> expr = root.get(field);
                yield cb.equal(expr, uuid);
            }
            case "ne" -> {
                UUID uuid = parseUuid(valueRaw);
                Expression<UUID> expr = root.get(field);
                yield cb.notEqual(expr, uuid);
            }
            default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for UUID field '" + field + "'");
        };
    }

    private static Predicate integerPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        Integer value = parseInteger(valueRaw);
        Expression<Integer> expr = root.get(field);

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

    private static Predicate instantPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
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

    private static Predicate athleteDatePredicate(Root<Accreditation> root, CriteriaBuilder cb, String op, String valueRaw) {
        LocalDate date = parseLocalDate(valueRaw);
        Join<Accreditation, Athlete> athleteJoin = root.join("athlete", JoinType.INNER);
        Expression<LocalDate> expr = athleteJoin.get("dateOfBirth");
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

    private static Integer parseInteger(String valueRaw) {
        String v = parseString(valueRaw);
        try {
            return Integer.parseInt(v);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid integer value: " + valueRaw);
        }
    }

    private static Instant parseInstant(String valueRaw) {
        String v = parseString(valueRaw);
        try {
            return Instant.parse(v);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid date-time value: " + valueRaw);
        }
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
}

