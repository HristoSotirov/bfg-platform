package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.CompetitionEventTimetableTemplate;
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

public final class CompetitionEventTimetableTemplateQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "dayOffset"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("dayOffset_asc", new Sort.Order(Sort.Direction.ASC, "dayOffset")),
            Map.entry("dayOffset_desc", new Sort.Order(Sort.Direction.DESC, "dayOffset")),
            Map.entry("eventNumber_asc", new Sort.Order(Sort.Direction.ASC, "eventNumber")),
            Map.entry("eventNumber_desc", new Sort.Order(Sort.Direction.DESC, "eventNumber")),
            Map.entry("plannedTime_asc", new Sort.Order(Sort.Direction.ASC, "plannedTime")),
            Map.entry("plannedTime_desc", new Sort.Order(Sort.Direction.DESC, "plannedTime")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt")),
            Map.entry("modifiedAt_asc", new Sort.Order(Sort.Direction.ASC, "modifiedAt")),
            Map.entry("modifiedAt_desc", new Sort.Order(Sort.Direction.DESC, "modifiedAt"))
    );

    private CompetitionEventTimetableTemplateQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<CompetitionEventTimetableTemplate> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<CompetitionEventTimetableTemplate> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<CompetitionEventTimetableTemplate> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                CompetitionEventTimetableTemplate.class,
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
                CompetitionEventTimetableTemplate.class,
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
                CompetitionEventTimetableTemplate.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<CompetitionEventTimetableTemplate> {
        @Override
        public Predicate build(Root<CompetitionEventTimetableTemplate> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return buildPredicate(root, cb, field, op, valueRaw);
        }

        @Override
        public Predicate buildRange(Root<CompetitionEventTimetableTemplate> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "dayOffset", "eventNumber", "qualificationStageNumber" ->
                    QueryAdapterHelpers.integerRangePredicate(root, cb, field, minValue, maxValue);
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<CompetitionEventTimetableTemplate> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "competitionTemplateId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, field, values);
                case "disciplineCode" -> QueryAdapterHelpers.stringInPredicate(root, cb, field, values);
                case "qualificationEventType" -> QueryAdapterHelpers.stringInPredicate(root, cb, "qualificationEventType", values);
                case "dayOffset", "eventNumber", "qualificationStageNumber" -> QueryAdapterHelpers.integerInPredicate(root, cb, field, values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }

    private static Predicate buildPredicate(Root<CompetitionEventTimetableTemplate> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "competitionTemplateId" -> QueryAdapterHelpers.uuidPredicate(root, cb, field, op, valueRaw);
            case "disciplineCode" -> QueryAdapterHelpers.stringPredicate(root, cb, field, op, valueRaw);
            case "qualificationEventType" -> QueryAdapterHelpers.stringPredicate(root, cb, "qualificationEventType", op, valueRaw);
            case "dayOffset", "eventNumber", "qualificationStageNumber" -> QueryAdapterHelpers.integerPredicate(root, cb, field, op, valueRaw);
            case "createdAt", "modifiedAt" -> QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }
}
