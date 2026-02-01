package com.bfg.platform.club.query;

import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.common.query.FilterExpressionParser;
import com.bfg.platform.common.query.QueryAdapterHelpers;
import com.bfg.platform.common.query.SortParser;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.List;
import java.util.Map;

public final class ClubCoachQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.DESC, "assignmentDate"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("assignmentDate_asc", new Sort.Order(Sort.Direction.ASC, "assignmentDate")),
            Map.entry("assignmentDate_desc", new Sort.Order(Sort.Direction.DESC, "assignmentDate")),
            Map.entry("coachId_asc", new Sort.Order(Sort.Direction.ASC, "coachId")),
            Map.entry("coachId_desc", new Sort.Order(Sort.Direction.DESC, "coachId"))
    );

    private ClubCoachQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<ClubCoach> parseFilter(String filter) {
        return FilterExpressionParser.parse(filter, ClubCoachQueryAdapter::buildPredicate);
    }

    public static Sort parseSort(List<String> orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    public static Sort parseSort(String orderBy) {
        return SortParser.parse(orderBy, ORDER_MAP, DEFAULT_SORT);
    }

    private static Predicate buildPredicate(Root<ClubCoach> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
        return switch (field) {
            case "clubId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "clubId", op, valueRaw);
            default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
        };
    }
}

