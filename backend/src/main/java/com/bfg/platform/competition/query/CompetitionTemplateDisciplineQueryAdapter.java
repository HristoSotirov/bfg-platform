package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.CompetitionTemplateDiscipline;
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

public final class CompetitionTemplateDisciplineQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "id"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt")),
            Map.entry("modifiedAt_asc", new Sort.Order(Sort.Direction.ASC, "modifiedAt")),
            Map.entry("modifiedAt_desc", new Sort.Order(Sort.Direction.DESC, "modifiedAt"))
    );

    private CompetitionTemplateDisciplineQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<CompetitionTemplateDiscipline> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<CompetitionTemplateDiscipline> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<CompetitionTemplateDiscipline> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                CompetitionTemplateDiscipline.class,
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
                CompetitionTemplateDiscipline.class,
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
                CompetitionTemplateDiscipline.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<CompetitionTemplateDiscipline> {
        @Override
        public Predicate build(Root<CompetitionTemplateDiscipline> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return buildPredicate(root, cb, field, op, valueRaw);
        }

        @Override
        public Predicate buildRange(Root<CompetitionTemplateDiscipline> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<CompetitionTemplateDiscipline> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "competitionTemplateId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "competitionTemplateId", values);
                case "disciplineId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "disciplineId", values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }

    private static Predicate buildPredicate(Root<CompetitionTemplateDiscipline> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "competitionTemplateId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "competitionTemplateId", op, valueRaw);
            case "disciplineId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "disciplineId", op, valueRaw);
            case "createdAt", "modifiedAt" -> QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }
}
