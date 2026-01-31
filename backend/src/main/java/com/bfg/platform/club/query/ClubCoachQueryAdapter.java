package com.bfg.platform.club.query;

import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.common.query.FilterExpressionParser;
import com.bfg.platform.common.query.SortParser;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.Map;
import java.util.UUID;

public final class ClubCoachQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.DESC, "assignmentDate"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("assignmentDate_asc", new Sort.Order(Sort.Direction.ASC, "assignmentDate")),
            Map.entry("assignmentDate_desc", new Sort.Order(Sort.Direction.DESC, "assignmentDate")),
            Map.entry("coachId_asc", new Sort.Order(Sort.Direction.ASC, "coachId")),
            Map.entry("coachId_desc", new Sort.Order(Sort.Direction.DESC, "coachId"))
    );

    private ClubCoachQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<ClubCoach> parseFilter(String filter) {
        return FilterExpressionParser.parse(filter, ClubCoachQueryAdapter::buildPredicate);
    }

    public static Sort parseSort(String orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    private static Predicate buildPredicate(Root<ClubCoach> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "clubId" -> uuidPredicate(root, cb, "clubId", op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate uuidPredicate(Root<ClubCoach> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
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

    private static UUID parseUuid(String valueRaw) {
        String v = parseString(valueRaw);
        try {
            return UUID.fromString(v);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid UUID value: " + valueRaw);
        }
    }

    private static String parseString(String valueRaw) {
        String v = valueRaw.trim();
        if (v.startsWith("'") && v.endsWith("'") && v.length() >= 2) {
            v = v.substring(1, v.length() - 1);
        }
        v = v.replace("\\'", "'");
        return v;
    }
}

