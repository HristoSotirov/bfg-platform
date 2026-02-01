package com.bfg.platform.athlete.query;

import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.common.query.FilterExpressionParser;
import com.bfg.platform.common.query.QueryAdapterHelpers;
import com.bfg.platform.common.query.SortParser;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class AthleteQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.ASC, "lastName"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("lastName_asc", new Sort.Order(Sort.Direction.ASC, "lastName")),
            Map.entry("lastName_desc", new Sort.Order(Sort.Direction.DESC, "lastName")),
            Map.entry("firstName_asc", new Sort.Order(Sort.Direction.ASC, "firstName")),
            Map.entry("firstName_desc", new Sort.Order(Sort.Direction.DESC, "firstName")),
            Map.entry("dateOfBirth_asc", new Sort.Order(Sort.Direction.ASC, "dateOfBirth")),
            Map.entry("dateOfBirth_desc", new Sort.Order(Sort.Direction.DESC, "dateOfBirth")),
            Map.entry("registeredOn_asc", new Sort.Order(Sort.Direction.ASC, "registeredOn")),
            Map.entry("registeredOn_desc", new Sort.Order(Sort.Direction.DESC, "registeredOn"))
    );

    private AthleteQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<Athlete> parseFilter(String filter) {
        return FilterExpressionParser.parse(filter, AthleteQueryAdapter::buildPredicate);
    }

    public static Sort parseSort(List<String> orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    public static Sort parseSort(String orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    public static Specification<Athlete> parseSearch(String search) {
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

    private static Predicate buildPredicate(Root<Athlete> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "firstName", "middleName", "lastName", "gender" -> QueryAdapterHelpers.stringPredicate(root, cb, field, op, valueRaw);
            case "dateOfBirth", "medicalExaminationDue", "insuranceFrom", "insuranceTo" -> QueryAdapterHelpers.datePredicate(root, cb, field, op, valueRaw);
            case "registeredOn" -> QueryAdapterHelpers.instantPredicate(root, cb, "registeredOn", op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }

    private static Predicate buildSearchPredicate(Root<Athlete> root, CriteriaBuilder cb, String token) {
        String normalized = token.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        String likeValue = "%" + normalized.toLowerCase(Locale.ROOT) + "%";
        List<Predicate> fieldPredicates = new ArrayList<>();
        fieldPredicates.add(cb.like(cb.lower(root.get("firstName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("middleName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("lastName").as(String.class)), likeValue));
        LocalDate date = QueryAdapterHelpers.tryParseDate(normalized);
        if (date != null) {
            fieldPredicates.add(cb.equal(root.get("dateOfBirth"), date));
        }
        return cb.or(fieldPredicates.toArray(new Predicate[0]));
    }
}

