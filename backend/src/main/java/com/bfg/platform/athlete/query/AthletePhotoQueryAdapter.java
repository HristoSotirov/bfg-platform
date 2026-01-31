package com.bfg.platform.athlete.query;

import com.bfg.platform.athlete.entity.AthletePhotoHistory;
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

public final class AthletePhotoQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.DESC, "uploadedAt"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("uploadedAt_asc", new Sort.Order(Sort.Direction.ASC, "uploadedAt")),
            Map.entry("uploadedAt_desc", new Sort.Order(Sort.Direction.DESC, "uploadedAt"))
    );

    private AthletePhotoQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<AthletePhotoHistory> parseFilter(String filter) {
        return FilterExpressionParser.parse(filter, AthletePhotoQueryAdapter::buildPredicate);
    }

    public static Sort parseSort(String orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    private static Predicate buildPredicate(Root<AthletePhotoHistory> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "athleteId" -> uuidPredicate(root, cb, "athleteId", op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate uuidPredicate(Root<AthletePhotoHistory> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
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

