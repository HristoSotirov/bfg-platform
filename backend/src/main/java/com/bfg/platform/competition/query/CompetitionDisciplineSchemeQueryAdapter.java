package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.CompetitionDisciplineScheme;
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

public final class CompetitionDisciplineSchemeQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "createdAt"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt")),
            Map.entry("modifiedAt_asc", new Sort.Order(Sort.Direction.ASC, "modifiedAt")),
            Map.entry("modifiedAt_desc", new Sort.Order(Sort.Direction.DESC, "modifiedAt"))
    );

    private CompetitionDisciplineSchemeQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<CompetitionDisciplineScheme> parseFilter(String filter) {
        return parseFilter(filter, null).getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<CompetitionDisciplineScheme> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                CompetitionDisciplineScheme.class,
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
                CompetitionDisciplineScheme.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<CompetitionDisciplineScheme> {
        @Override
        public Predicate build(Root<CompetitionDisciplineScheme> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return switch (field) {
                case "competitionId", "disciplineId" ->
                    QueryAdapterHelpers.uuidPredicate(root, cb, field, op, valueRaw);
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
                default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
            };
        }

        @Override
        public Predicate buildRange(Root<CompetitionDisciplineScheme> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<CompetitionDisciplineScheme> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "competitionId", "disciplineId" ->
                    QueryAdapterHelpers.uuidInPredicate(root, cb, field, values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }
}
