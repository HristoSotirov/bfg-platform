package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.QualificationStage;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.QueryAdapterHelpers;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class QualificationStageQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "stageRank"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("stageRank_asc", new Sort.Order(Sort.Direction.ASC, "stageRank")),
            Map.entry("stageRank_desc", new Sort.Order(Sort.Direction.DESC, "stageRank")),
            Map.entry("boatCountMin_asc", new Sort.Order(Sort.Direction.ASC, "boatCountMin")),
            Map.entry("boatCountMin_desc", new Sort.Order(Sort.Direction.DESC, "boatCountMin")),
            Map.entry("boatCountMax_asc", new Sort.Order(Sort.Direction.ASC, "boatCountMax")),
            Map.entry("boatCountMax_desc", new Sort.Order(Sort.Direction.DESC, "boatCountMax")),
            Map.entry("eventCount_asc", new Sort.Order(Sort.Direction.ASC, "eventCount")),
            Map.entry("eventCount_desc", new Sort.Order(Sort.Direction.DESC, "eventCount")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt")),
            Map.entry("modifiedAt_asc", new Sort.Order(Sort.Direction.ASC, "modifiedAt")),
            Map.entry("modifiedAt_desc", new Sort.Order(Sort.Direction.DESC, "modifiedAt"))
    );

    private QualificationStageQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<QualificationStage> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<QualificationStage> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<QualificationStage> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                QualificationStage.class,
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
                QualificationStage.class,
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
                QualificationStage.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<QualificationStage> {
        @Override
        public Predicate build(Root<QualificationStage> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return buildPredicate(root, cb, field, op, valueRaw);
        }

        @Override
        public Predicate buildRange(Root<QualificationStage> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "boatCountMin", "boatCountMax", "eventCount", "stageRank" ->
                    QueryAdapterHelpers.integerRangePredicate(root, cb, field, minValue, maxValue);
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<QualificationStage> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "qualificationSchemeId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "qualificationSchemeId", values);
                case "qualificationEventType" -> QueryAdapterHelpers.stringInPredicate(root, cb, "qualificationEventType", values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }

    public static Specification<QualificationStage> parseSearch(String search) {
        if (search == null || search.isBlank()) {
            return Specification.where(null);
        }
        List<String> tokens = QueryAdapterHelpers.tokenize(search);
        if (tokens.isEmpty()) {
            return Specification.where(null);
        }
        return (root, query, cb) -> {
            List<Predicate> tokenPredicates = new ArrayList<>();
            for (String token : tokens) {
                Predicate predicate = buildSearchPredicate(root, cb, token);
                if (predicate != null) {
                    tokenPredicates.add(predicate);
                }
            }
            if (tokenPredicates.isEmpty()) {
                return cb.conjunction();
            }
            return cb.and(tokenPredicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate buildPredicate(Root<QualificationStage> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "qualificationSchemeId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "qualificationSchemeId", op, valueRaw);
            case "boatCountMin", "boatCountMax", "eventCount", "stageRank" -> QueryAdapterHelpers.integerPredicate(root, cb, field, op, valueRaw);
            case "qualificationEventType" -> QueryAdapterHelpers.stringPredicate(root, cb, "qualificationEventType", op, valueRaw);
            case "createdAt", "modifiedAt" -> QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate buildSearchPredicate(Root<QualificationStage> root, CriteriaBuilder cb, String token) {
        String normalized = token.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        String likeValue = "%" + normalized.toLowerCase(java.util.Locale.ROOT) + "%";
        List<Predicate> fieldPredicates = new ArrayList<>();
        fieldPredicates.add(cb.like(cb.lower(root.get("qualificationEventType").as(String.class)), likeValue));
        return cb.or(fieldPredicates.toArray(new Predicate[0]));
    }
}
