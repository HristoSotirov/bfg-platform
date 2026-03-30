package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.QualificationProgression;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.QueryAdapterHelpers;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class QualificationProgressionQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "createdAt"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt"))
    );

    private QualificationProgressionQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<QualificationProgression> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<QualificationProgression> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<QualificationProgression> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                QualificationProgression.class,
                requestedExpand
        );
    }

    public static Sort parseSort(List<String> orderBy) {
        return parseSort(orderBy, null).getSort();
    }

    public static EnhancedSortParser.ParseResult parseSort(List<String> orderBy, Set<String> requestedExpand) {
        return EnhancedSortParser.parse(
                orderBy,
                ORDER_MAP,
                DEFAULT_SORT,
                QualificationProgression.class,
                requestedExpand
        );
    }

    public static Sort parseSort(String orderBy) {
        return parseSort(orderBy, null).getSort();
    }

    public static EnhancedSortParser.ParseResult parseSort(String orderBy, Set<String> requestedExpand) {
        return EnhancedSortParser.parse(
                orderBy,
                ORDER_MAP,
                DEFAULT_SORT,
                QualificationProgression.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<QualificationProgression> {
        @Override
        public Predicate build(Root<QualificationProgression> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return buildPredicate(root, cb, field, op, valueRaw);
        }

        @Override
        public Predicate buildRange(Root<QualificationProgression> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<QualificationProgression> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "qualificationTierId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "qualificationTierId", values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }

    public static Specification<QualificationProgression> parseSearch(String search) {
        if (search == null || search.isBlank()) {
            return Specification.where(null);
        }
        return Specification.where(null);
    }

    private static Predicate buildPredicate(Root<QualificationProgression> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "qualificationTierId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "qualificationTierId", op, valueRaw);
            case "sourceEvent", "destEvent" -> QueryAdapterHelpers.stringPredicate(root, cb, field, op, valueRaw);
            case "createdAt", "modifiedAt" -> QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }
}
