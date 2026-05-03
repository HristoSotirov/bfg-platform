package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.Entry;
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

public final class EntryQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(
            new Sort.Order(Sort.Direction.ASC, "disciplineId"),
            new Sort.Order(Sort.Direction.ASC, "teamNumber")
    );
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("teamNumber_asc", new Sort.Order(Sort.Direction.ASC, "teamNumber")),
            Map.entry("teamNumber_desc", new Sort.Order(Sort.Direction.DESC, "teamNumber")),
            Map.entry("disciplineId_asc", new Sort.Order(Sort.Direction.ASC, "disciplineId")),
            Map.entry("disciplineId_desc", new Sort.Order(Sort.Direction.DESC, "disciplineId")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt"))
    );

    private EntryQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<Entry> parseFilter(String filter) {
        return parseFilter(filter, null).getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<Entry> parseFilter(
            String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                Entry.class,
                requestedExpand
        );
    }

    public static Sort parseSort(List<String> orderBy) {
        return parseSort(orderBy, null).getSort();
    }

    public static EnhancedSortParser.ParseResult parseSort(
            List<String> orderBy, Set<String> requestedExpand) {
        return EnhancedSortParser.parse(
                orderBy,
                ORDER_MAP,
                DEFAULT_SORT,
                Entry.class,
                requestedExpand
        );
    }

    /**
     * Builds a base specification that scopes entries to a competition and optionally a club.
     */
    public static Specification<Entry> scopeToCompetition(java.util.UUID competitionId, java.util.UUID clubId) {
        return (root, query, cb) -> {
            Predicate predicate = cb.equal(root.get("competitionId"), competitionId);
            if (clubId != null) {
                predicate = cb.and(predicate, cb.equal(root.get("clubId"), clubId));
            }
            return predicate;
        };
    }

    private static class EnhancedPredicateBuilder
            implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<Entry> {

        @Override
        public Predicate build(Root<Entry> root, CriteriaBuilder cb,
                               String field, String op, String valueRaw) {
            return switch (field) {
                case "competitionId", "clubId", "disciplineId" ->
                    QueryAdapterHelpers.uuidPredicate(root, cb, field, op, valueRaw);
                case "teamNumber" ->
                    QueryAdapterHelpers.integerPredicate(root, cb, field, op, valueRaw);
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
                default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
            };
        }

        @Override
        public Predicate buildRange(Root<Entry> root, CriteriaBuilder cb,
                                    String field, String minValue, String maxValue) {
            return switch (field) {
                case "teamNumber" ->
                    QueryAdapterHelpers.integerRangePredicate(root, cb, field, minValue, maxValue);
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<Entry> root, CriteriaBuilder cb,
                                 String field, List<String> values) {
            return switch (field) {
                case "competitionId", "clubId", "disciplineId" ->
                    QueryAdapterHelpers.uuidInPredicate(root, cb, field, values);
                case "teamNumber" ->
                    QueryAdapterHelpers.integerInPredicate(root, cb, field, values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }
}
