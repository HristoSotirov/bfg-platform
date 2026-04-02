package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.Competition;
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
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class CompetitionQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "name"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("name_asc", new Sort.Order(Sort.Direction.ASC, "name")),
            Map.entry("name_desc", new Sort.Order(Sort.Direction.DESC, "name")),
            Map.entry("shortName_asc", new Sort.Order(Sort.Direction.ASC, "shortName")),
            Map.entry("shortName_desc", new Sort.Order(Sort.Direction.DESC, "shortName")),
            Map.entry("season_asc", new Sort.Order(Sort.Direction.ASC, "season")),
            Map.entry("season_desc", new Sort.Order(Sort.Direction.DESC, "season")),
            Map.entry("startDate_asc", new Sort.Order(Sort.Direction.ASC, "startDate")),
            Map.entry("startDate_desc", new Sort.Order(Sort.Direction.DESC, "startDate")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt")),
            Map.entry("modifiedAt_asc", new Sort.Order(Sort.Direction.ASC, "modifiedAt")),
            Map.entry("modifiedAt_desc", new Sort.Order(Sort.Direction.DESC, "modifiedAt"))
    );

    private CompetitionQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<Competition> parseFilter(String filter) {
        return parseFilter(filter, null).getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<Competition> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                Competition.class,
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
                Competition.class,
                requestedExpand
        );
    }

    public static Specification<Competition> parseSearch(String search) {
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

    private static Predicate buildSearchPredicate(Root<Competition> root, CriteriaBuilder cb, String token) {
        String normalized = token.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        String likeValue = "%" + normalized.toLowerCase(Locale.ROOT) + "%";
        List<Predicate> fieldPredicates = new ArrayList<>();
        fieldPredicates.add(cb.like(cb.lower(root.get("name")), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("shortName")), likeValue));
        return cb.or(fieldPredicates.toArray(new Predicate[0]));
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<Competition> {
        @Override
        public Predicate build(Root<Competition> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return switch (field) {
                case "name", "shortName", "location", "status", "scopeType" ->
                    QueryAdapterHelpers.stringPredicate(root, cb, field, op, valueRaw);
                case "isTemplate" ->
                    QueryAdapterHelpers.booleanPredicate(root, cb, field, op, valueRaw);
                case "season" ->
                    QueryAdapterHelpers.integerPredicate(root, cb, field, op, valueRaw);
                case "scoringSchemeId", "qualificationSchemeId" ->
                    QueryAdapterHelpers.uuidPredicate(root, cb, field, op, valueRaw);
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
                default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
            };
        }

        @Override
        public Predicate buildRange(Root<Competition> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "season" ->
                    QueryAdapterHelpers.integerRangePredicate(root, cb, field, minValue, maxValue);
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<Competition> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "name", "shortName", "status", "scopeType" ->
                    QueryAdapterHelpers.stringInPredicate(root, cb, field, values);
                case "scoringSchemeId", "qualificationSchemeId" ->
                    QueryAdapterHelpers.uuidInPredicate(root, cb, field, values);
                case "isTemplate" ->
                    QueryAdapterHelpers.booleanInPredicate(root, cb, field, values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }
}
