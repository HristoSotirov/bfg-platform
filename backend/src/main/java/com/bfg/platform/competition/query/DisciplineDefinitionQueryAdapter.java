package com.bfg.platform.competition.query;

import com.bfg.platform.competition.entity.DisciplineDefinition;
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

public final class DisciplineDefinitionQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "name"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("name_asc", new Sort.Order(Sort.Direction.ASC, "name")),
            Map.entry("name_desc", new Sort.Order(Sort.Direction.DESC, "name")),
            Map.entry("shortName_asc", new Sort.Order(Sort.Direction.ASC, "shortName")),
            Map.entry("shortName_desc", new Sort.Order(Sort.Direction.DESC, "shortName")),
            Map.entry("boatClass_asc", new Sort.Order(Sort.Direction.ASC, "boatClass")),
            Map.entry("boatClass_desc", new Sort.Order(Sort.Direction.DESC, "boatClass")),
            Map.entry("crewSize_asc", new Sort.Order(Sort.Direction.ASC, "crewSize")),
            Map.entry("crewSize_desc", new Sort.Order(Sort.Direction.DESC, "crewSize")),
            Map.entry("distanceMeters_asc", new Sort.Order(Sort.Direction.ASC, "distanceMeters")),
            Map.entry("distanceMeters_desc", new Sort.Order(Sort.Direction.DESC, "distanceMeters")),
            Map.entry("isActive_asc", new Sort.Order(Sort.Direction.ASC, "isActive")),
            Map.entry("isActive_desc", new Sort.Order(Sort.Direction.DESC, "isActive")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt")),
            Map.entry("modifiedAt_asc", new Sort.Order(Sort.Direction.ASC, "modifiedAt")),
            Map.entry("modifiedAt_desc", new Sort.Order(Sort.Direction.DESC, "modifiedAt"))
    );

    private DisciplineDefinitionQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<DisciplineDefinition> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<DisciplineDefinition> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<DisciplineDefinition> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                DisciplineDefinition.class,
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
                DisciplineDefinition.class,
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
                DisciplineDefinition.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<DisciplineDefinition> {
        @Override
        public Predicate build(Root<DisciplineDefinition> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return buildPredicate(root, cb, field, op, valueRaw);
        }

        @Override
        public Predicate buildRange(Root<DisciplineDefinition> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "crewSize", "distanceMeters", "maxCrewFromTransfer" ->
                    QueryAdapterHelpers.integerRangePredicate(root, cb, field, minValue, maxValue);
                case "createdAt", "modifiedAt" ->
                    QueryAdapterHelpers.instantRangePredicate(root, cb, field, minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        @Override
        public Predicate buildIn(Root<DisciplineDefinition> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "name", "shortName", "boatClass" -> QueryAdapterHelpers.stringInPredicate(root, cb, field, values);
                case "isActive" -> QueryAdapterHelpers.booleanInPredicate(root, cb, "isActive", values);
                case "hasCoxswain" -> QueryAdapterHelpers.booleanInPredicate(root, cb, "hasCoxswain", values);
                case "isLightweight" -> QueryAdapterHelpers.booleanInPredicate(root, cb, "isLightweight", values);
                case "competitionGroupId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "competitionGroupId", values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }

    public static Specification<DisciplineDefinition> parseSearch(String search) {
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

    private static Predicate buildPredicate(Root<DisciplineDefinition> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "name", "shortName", "boatClass" -> QueryAdapterHelpers.stringPredicate(root, cb, field, op, valueRaw);
            case "crewSize", "distanceMeters", "maxCrewFromTransfer" -> QueryAdapterHelpers.integerPredicate(root, cb, field, op, valueRaw);
            case "hasCoxswain" -> QueryAdapterHelpers.booleanPredicate(root, cb, "hasCoxswain", op, valueRaw);
            case "isLightweight" -> QueryAdapterHelpers.booleanPredicate(root, cb, "isLightweight", op, valueRaw);
            case "isActive" -> QueryAdapterHelpers.booleanPredicate(root, cb, "isActive", op, valueRaw);
            case "competitionGroupId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "competitionGroupId", op, valueRaw);
            case "createdAt", "modifiedAt" -> QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate buildSearchPredicate(Root<DisciplineDefinition> root, CriteriaBuilder cb, String token) {
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
}
