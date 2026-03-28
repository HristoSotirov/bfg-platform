package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.QualificationRule;
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

public final class QualificationRuleQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "createdAt"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt")),
            Map.entry("modifiedAt_asc", new Sort.Order(Sort.Direction.ASC, "modifiedAt")),
            Map.entry("modifiedAt_desc", new Sort.Order(Sort.Direction.DESC, "modifiedAt"))
    );

    private QualificationRuleQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<QualificationRule> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<QualificationRule> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<QualificationRule> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                QualificationRule.class,
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
                QualificationRule.class,
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
                QualificationRule.class,
                requestedExpand
        );
    }

    public static Specification<QualificationRule> parseSearch(String search) {
        return Specification.where(null);
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<QualificationRule> {
        @Override
        public Predicate build(Root<QualificationRule> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return switch (field) {
                case "qualificationSchemeId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "qualificationSchemeId", op, valueRaw);
                case "sourceStageId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "sourceStageId", op, valueRaw);
                case "destinationStageId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "destinationStageId", op, valueRaw);
                case "isRemainder" -> QueryAdapterHelpers.booleanPredicate(root, cb, "isRemainder", op, valueRaw);
                case "createdAt", "modifiedAt" -> QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
                default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
            };
        }

        @Override
        public Predicate buildRange(Root<QualificationRule> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            throw new IllegalArgumentException("Range operator not supported for QualificationRule fields");
        }

        @Override
        public Predicate buildIn(Root<QualificationRule> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "qualificationSchemeId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "qualificationSchemeId", values);
                case "sourceStageId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "sourceStageId", values);
                case "destinationStageId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "destinationStageId", values);
                case "isRemainder" -> QueryAdapterHelpers.booleanInPredicate(root, cb, "isRemainder", values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }
}
