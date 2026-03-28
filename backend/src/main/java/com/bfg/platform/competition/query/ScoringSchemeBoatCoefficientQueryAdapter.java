package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.ScoringSchemeBoatCoefficient;
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

public final class ScoringSchemeBoatCoefficientQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "scoringSchemeId"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("scoringSchemeId_asc", new Sort.Order(Sort.Direction.ASC, "scoringSchemeId")),
            Map.entry("scoringSchemeId_desc", new Sort.Order(Sort.Direction.DESC, "scoringSchemeId")),
            Map.entry("boatClass_asc", new Sort.Order(Sort.Direction.ASC, "boatClass")),
            Map.entry("boatClass_desc", new Sort.Order(Sort.Direction.DESC, "boatClass")),
            Map.entry("coefficient_asc", new Sort.Order(Sort.Direction.ASC, "coefficient")),
            Map.entry("coefficient_desc", new Sort.Order(Sort.Direction.DESC, "coefficient")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt")),
            Map.entry("modifiedAt_asc", new Sort.Order(Sort.Direction.ASC, "modifiedAt")),
            Map.entry("modifiedAt_desc", new Sort.Order(Sort.Direction.DESC, "modifiedAt"))
    );

    private ScoringSchemeBoatCoefficientQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<ScoringSchemeBoatCoefficient> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<ScoringSchemeBoatCoefficient> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<ScoringSchemeBoatCoefficient> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                ScoringSchemeBoatCoefficient.class,
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
                ScoringSchemeBoatCoefficient.class,
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
                ScoringSchemeBoatCoefficient.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<ScoringSchemeBoatCoefficient> {
        @Override
        public Predicate build(Root<ScoringSchemeBoatCoefficient> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return buildPredicate(root, cb, field, op, valueRaw);
        }

        @Override
        public Predicate buildRange(Root<ScoringSchemeBoatCoefficient> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<ScoringSchemeBoatCoefficient> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "scoringSchemeId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "scoringSchemeId", values);
                case "boatClass" -> QueryAdapterHelpers.stringInPredicate(root, cb, "boatClass", values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }

    public static Specification<ScoringSchemeBoatCoefficient> parseSearch(String search) {
        if (search == null || search.isBlank()) {
            return Specification.where(null);
        }
        return Specification.where(null);
    }

    private static Predicate buildPredicate(Root<ScoringSchemeBoatCoefficient> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "scoringSchemeId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "scoringSchemeId", op, valueRaw);
            case "boatClass" -> QueryAdapterHelpers.stringPredicate(root, cb, "boatClass", op, valueRaw);
            case "createdAt", "modifiedAt" -> QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }
}
