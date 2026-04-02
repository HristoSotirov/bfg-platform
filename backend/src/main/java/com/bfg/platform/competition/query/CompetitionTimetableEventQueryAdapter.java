package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
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

public final class CompetitionTimetableEventQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(
            new Sort.Order(Sort.Direction.ASC, "dayOffset"),
            new Sort.Order(Sort.Direction.ASC, "eventNumber")
    );
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("dayOffset_asc", new Sort.Order(Sort.Direction.ASC, "dayOffset")),
            Map.entry("dayOffset_desc", new Sort.Order(Sort.Direction.DESC, "dayOffset")),
            Map.entry("eventNumber_asc", new Sort.Order(Sort.Direction.ASC, "eventNumber")),
            Map.entry("eventNumber_desc", new Sort.Order(Sort.Direction.DESC, "eventNumber")),
            Map.entry("plannedTime_asc", new Sort.Order(Sort.Direction.ASC, "plannedTime")),
            Map.entry("plannedTime_desc", new Sort.Order(Sort.Direction.DESC, "plannedTime")),
            Map.entry("scheduledAt_asc", new Sort.Order(Sort.Direction.ASC, "scheduledAt")),
            Map.entry("scheduledAt_desc", new Sort.Order(Sort.Direction.DESC, "scheduledAt")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt"))
    );

    private CompetitionTimetableEventQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<CompetitionTimetableEvent> parseFilter(String filter) {
        return parseFilter(filter, null).getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<CompetitionTimetableEvent> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                CompetitionTimetableEvent.class,
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
                CompetitionTimetableEvent.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<CompetitionTimetableEvent> {
        @Override
        public Predicate build(Root<CompetitionTimetableEvent> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return switch (field) {
                case "qualificationEventType", "eventStatus" ->
                    QueryAdapterHelpers.stringPredicate(root, cb, field, op, valueRaw);
                case "competitionId", "disciplineId" ->
                    QueryAdapterHelpers.uuidPredicate(root, cb, field, op, valueRaw);
                case "eventNumber", "qualificationStageNumber", "dayOffset" ->
                    QueryAdapterHelpers.integerPredicate(root, cb, field, op, valueRaw);
                case "scheduledAt", "startedAt", "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
                default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
            };
        }

        @Override
        public Predicate buildRange(Root<CompetitionTimetableEvent> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "eventNumber", "qualificationStageNumber", "dayOffset" ->
                    QueryAdapterHelpers.integerRangePredicate(root, cb, field, minValue, maxValue);
                case "scheduledAt", "startedAt", "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<CompetitionTimetableEvent> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "qualificationEventType", "eventStatus" ->
                    QueryAdapterHelpers.stringInPredicate(root, cb, field, values);
                case "competitionId", "disciplineId" ->
                    QueryAdapterHelpers.uuidInPredicate(root, cb, field, values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }
}
