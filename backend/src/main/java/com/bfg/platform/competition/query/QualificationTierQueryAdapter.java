package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.QualificationTier;
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

public final class QualificationTierQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "boatCountMin"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("boatCountMin_asc", new Sort.Order(Sort.Direction.ASC, "boatCountMin")),
            Map.entry("boatCountMin_desc", new Sort.Order(Sort.Direction.DESC, "boatCountMin")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt"))
    );

    private QualificationTierQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<QualificationTier> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<QualificationTier> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<QualificationTier> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                QualificationTier.class,
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
                QualificationTier.class,
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
                QualificationTier.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<QualificationTier> {
        @Override
        public Predicate build(Root<QualificationTier> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return buildPredicate(root, cb, field, op, valueRaw);
        }

        @Override
        public Predicate buildRange(Root<QualificationTier> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "boatCountMin", "boatCountMax" ->
                    QueryAdapterHelpers.integerRangePredicate(root, cb, field, minValue, maxValue);
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<QualificationTier> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "qualificationSchemeId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "qualificationSchemeId", values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }

    public static Specification<QualificationTier> parseSearch(String search) {
        if (search == null || search.isBlank()) {
            return Specification.where(null);
        }
        return Specification.where(null);
    }

    private static Predicate buildPredicate(Root<QualificationTier> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "qualificationSchemeId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "qualificationSchemeId", op, valueRaw);
            case "boatCountMin", "boatCountMax" -> QueryAdapterHelpers.integerPredicate(root, cb, field, op, valueRaw);
            case "createdAt", "modifiedAt" -> QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }
}
