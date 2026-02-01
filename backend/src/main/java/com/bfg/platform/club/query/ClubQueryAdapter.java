package com.bfg.platform.club.query;

import com.bfg.platform.club.entity.Club;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.QueryAdapterHelpers;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import java.util.Set;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class ClubQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "name"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("name_asc", new Sort.Order(Sort.Direction.ASC, "name")),
            Map.entry("name_desc", new Sort.Order(Sort.Direction.DESC, "name")),
            Map.entry("shortName_asc", new Sort.Order(Sort.Direction.ASC, "shortName")),
            Map.entry("shortName_desc", new Sort.Order(Sort.Direction.DESC, "shortName")),
            Map.entry("isActive_asc", new Sort.Order(Sort.Direction.ASC, "isActive")),
            Map.entry("isActive_desc", new Sort.Order(Sort.Direction.DESC, "isActive")),
            Map.entry("cardPrefix_asc", new Sort.Order(Sort.Direction.ASC, "cardPrefix")),
            Map.entry("cardPrefix_desc", new Sort.Order(Sort.Direction.DESC, "cardPrefix")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt"))
    );

    private ClubQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<Club> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<Club> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static EnhancedFilterExpressionParser.ParseResult<Club> parseFilter(String filter, Set<String> requestedExpand) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                Club.class,
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
                Club.class,
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
                Club.class,
                requestedExpand
        );
    }

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<Club> {
        @Override
        public Predicate build(Root<Club> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return buildPredicate(root, cb, field, op, valueRaw);
        }

        @Override
        public Predicate buildRange(Root<Club> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            throw new IllegalArgumentException("Range operator not supported for Club fields");
        }

        @Override
        public Predicate buildIn(Root<Club> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "name", "shortName" -> QueryAdapterHelpers.stringInPredicate(root, cb, field, values);
                case "isActive" -> QueryAdapterHelpers.booleanInPredicate(root, cb, "isActive", values);
                case "clubAdminId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "clubAdmin", values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }
    }

    public static Specification<Club> parseSearch(String search) {
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

    private static Predicate buildPredicate(Root<Club> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "name", "shortName", "cardPrefix" -> QueryAdapterHelpers.stringPredicate(root, cb, field, op, valueRaw);
            case "isActive", "clubStatus" -> QueryAdapterHelpers.booleanPredicate(root, cb, "isActive", op, valueRaw);
            case "createdAt", "modifiedAt" -> QueryAdapterHelpers.instantPredicate(root, cb, field, op, valueRaw);
            case "clubAdminId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "clubAdmin", op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate buildSearchPredicate(Root<Club> root, CriteriaBuilder cb, String token) {
        String normalized = token.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        String likeValue = "%" + normalized.toLowerCase(Locale.ROOT) + "%";
        List<Predicate> fieldPredicates = new ArrayList<>();
        fieldPredicates.add(cb.like(cb.lower(root.get("name")), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("shortName")), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("cardPrefix")), likeValue));
        return cb.or(fieldPredicates.toArray(new Predicate[0]));
    }

}

