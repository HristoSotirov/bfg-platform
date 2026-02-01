package com.bfg.platform.athlete.query;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.club.entity.Club;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.QueryAdapterHelpers;
import com.bfg.platform.gen.model.AccreditationStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class AccreditationQueryAdapter {
    private static final Sort DEFAULT_SORT = Sort.by(new Sort.Order(Sort.Direction.DESC, "year"));
    private static final Map<String, Sort.Order> ORDER_MAP = Map.ofEntries(
            Map.entry("year_asc", new Sort.Order(Sort.Direction.ASC, "year")),
            Map.entry("year_desc", new Sort.Order(Sort.Direction.DESC, "year")),
            Map.entry("accreditationNumber_asc", new Sort.Order(Sort.Direction.ASC, "accreditationNumber")),
            Map.entry("accreditationNumber_desc", new Sort.Order(Sort.Direction.DESC, "accreditationNumber")),
            Map.entry("createdAt_asc", new Sort.Order(Sort.Direction.ASC, "createdAt")),
            Map.entry("createdAt_desc", new Sort.Order(Sort.Direction.DESC, "createdAt")),
            Map.entry("athlete.dateOfBirth_asc", new Sort.Order(Sort.Direction.ASC, "athlete.dateOfBirth")),
            Map.entry("athlete.dateOfBirth_desc", new Sort.Order(Sort.Direction.DESC, "athlete.dateOfBirth")),
            Map.entry("athlete.firstName_asc", new Sort.Order(Sort.Direction.ASC, "athlete.firstName")),
            Map.entry("athlete.firstName_desc", new Sort.Order(Sort.Direction.DESC, "athlete.firstName")),
            Map.entry("athlete.lastName_asc", new Sort.Order(Sort.Direction.ASC, "athlete.lastName")),
            Map.entry("athlete.lastName_desc", new Sort.Order(Sort.Direction.DESC, "athlete.lastName")),
            Map.entry("club.name_asc", new Sort.Order(Sort.Direction.ASC, "club.name")),
            Map.entry("club.name_desc", new Sort.Order(Sort.Direction.DESC, "club.name"))
    );

    private AccreditationQueryAdapter() {
        throw new IllegalStateException("Utility class");
    }

    public static EnhancedFilterExpressionParser.ParseResult<Accreditation> parseFilter(
            String filter,
            Set<String> requestedExpand
    ) {
        return EnhancedFilterExpressionParser.parse(
                filter,
                new EnhancedPredicateBuilder(),
                Accreditation.class,
                requestedExpand
        );
    }

    public static EnhancedSortParser.ParseResult parseSort(
            List<String> orderBy,
            Set<String> requestedExpand
    ) {
        return EnhancedSortParser.parse(
                orderBy,
                ORDER_MAP,
                DEFAULT_SORT,
                Accreditation.class,
                requestedExpand
        );
    }

    public static EnhancedSortParser.ParseResult parseSort(
            String orderBy,
            Set<String> requestedExpand
    ) {
        return EnhancedSortParser.parse(
                orderBy,
                ORDER_MAP,
                DEFAULT_SORT,
                Accreditation.class,
                requestedExpand
        );
    }

    public static Specification<Accreditation> parseFilter(String filter) {
        EnhancedFilterExpressionParser.ParseResult<Accreditation> result = parseFilter(filter, null);
        return result.getSpecification();
    }

    public static Sort parseSort(String orderBy) {
        EnhancedSortParser.ParseResult result = parseSort(orderBy, null);
        return result.getSort();
    }

    public static Specification<Accreditation> parseSearch(String search) {
        if (search == null || search.isBlank()) {
            return Specification.where(null);
        }
        List<String> tokens = QueryAdapterHelpers.tokenize(search);
        if (tokens.isEmpty()) {
            return Specification.where(null);
        }
        return (root, query, cb) -> {
            query.distinct(true);
            Join<Accreditation, Athlete> athleteJoin = root.join("athlete", JoinType.LEFT);
            Join<Accreditation, Club> clubJoin = root.join("club", JoinType.LEFT);
            List<Predicate> tokenPredicates = new ArrayList<>();
            for (String token : tokens) {
                Predicate predicate = buildSearchPredicate(root, athleteJoin, clubJoin, cb, token);
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

    private static class EnhancedPredicateBuilder implements EnhancedFilterExpressionParser.EnhancedPredicateBuilder<Accreditation> {

        @Override
        public Predicate build(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            if (field.contains(".")) {
                return buildExpandedFieldPredicate(root, cb, field, op, valueRaw);
            }
            
            return buildRegularFieldPredicate(root, cb, field, op, valueRaw);
        }

        @Override
        public Predicate buildRange(Root<Accreditation> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            if (field.contains(".")) {
                return buildExpandedFieldRange(root, cb, field, minValue, maxValue);
            }
            return buildRegularFieldRange(root, cb, field, minValue, maxValue);
        }

        @Override
        public Predicate buildIn(Root<Accreditation> root, CriteriaBuilder cb, String field, List<String> values) {
            if (field.contains(".")) {
                return buildExpandedFieldIn(root, cb, field, values);
            }
            return buildRegularFieldIn(root, cb, field, values);
        }

        private Predicate buildExpandedFieldPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            String[] parts = field.split("\\.", 2);
            String expandField = parts[0];
            String subField = parts[1];

            Join<?, ?> join = getOrCreateJoin(root, cb, expandField);
            if (join == null) {
                return cb.conjunction(); // Silent skip if expand not requested
            }

            return switch (expandField) {
                case "athlete" -> buildAthleteFieldPredicate(join, cb, subField, op, valueRaw);
                case "club" -> buildClubFieldPredicate(join, cb, subField, op, valueRaw);
                default -> throw new IllegalArgumentException("Unsupported expand field: " + expandField);
            };
        }

        private Predicate buildExpandedFieldRange(Root<Accreditation> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            String[] parts = field.split("\\.", 2);
            String expandField = parts[0];
            String subField = parts[1];

            Join<?, ?> join = getOrCreateJoin(root, cb, expandField);
            if (join == null) {
                return cb.conjunction();
            }

            return switch (expandField) {
                case "athlete" -> buildAthleteFieldRange(join, cb, subField, minValue, maxValue);
                case "club" -> buildClubFieldRange(join, cb, subField, minValue, maxValue);
                default -> throw new IllegalArgumentException("Unsupported expand field: " + expandField);
            };
        }

        private Predicate buildExpandedFieldIn(Root<Accreditation> root, CriteriaBuilder cb, String field, List<String> values) {
            String[] parts = field.split("\\.", 2);
            String expandField = parts[0];
            String subField = parts[1];

            Join<?, ?> join = getOrCreateJoin(root, cb, expandField);
            if (join == null) {
                return cb.conjunction();
            }

            return switch (expandField) {
                case "athlete" -> buildAthleteFieldIn(join, cb, subField, values);
                case "club" -> buildClubFieldIn(join, cb, subField, values);
                default -> throw new IllegalArgumentException("Unsupported expand field: " + expandField);
            };
        }

        private Join<?, ?> getOrCreateJoin(Root<Accreditation> root, CriteriaBuilder cb, String expandField) {
            return switch (expandField) {
                case "athlete" -> root.join("athlete", JoinType.LEFT);
                case "club" -> root.join("club", JoinType.LEFT);
                default -> null;
            };
        }

        private Predicate buildAthleteFieldPredicate(Join<?, ?> athleteJoin, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return switch (field) {
                case "dateOfBirth" -> QueryAdapterHelpers.datePredicate(athleteJoin, cb, "dateOfBirth", op, valueRaw);
                case "firstName", "lastName", "middleName" -> QueryAdapterHelpers.stringPredicate(athleteJoin, cb, field, op, valueRaw);
                case "gender" -> QueryAdapterHelpers.stringPredicate(athleteJoin, cb, "gender", op, valueRaw);
                default -> throw new IllegalArgumentException("Unsupported athlete field: " + field);
            };
        }

        private Predicate buildClubFieldPredicate(Join<?, ?> clubJoin, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return switch (field) {
                case "name", "shortName" -> QueryAdapterHelpers.stringPredicate(clubJoin, cb, field, op, valueRaw);
                case "isActive" -> QueryAdapterHelpers.booleanPredicate(clubJoin, cb, "isActive", op, valueRaw);
                default -> throw new IllegalArgumentException("Unsupported club field: " + field);
            };
        }

        private Predicate buildAthleteFieldRange(Join<?, ?> athleteJoin, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            if (!"dateOfBirth".equals(field)) {
                throw new IllegalArgumentException("Range operator not supported for athlete field: " + field);
            }
            return QueryAdapterHelpers.dateRangePredicate(athleteJoin, cb, "dateOfBirth", minValue, maxValue);
        }

        private Predicate buildClubFieldRange(Join<?, ?> clubJoin, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            throw new IllegalArgumentException("Range operator not supported for club field: " + field);
        }

        private Predicate buildAthleteFieldIn(Join<?, ?> athleteJoin, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "gender" -> QueryAdapterHelpers.stringInPredicate(athleteJoin, cb, "gender", values);
                default -> throw new IllegalArgumentException("In operator not supported for athlete field: " + field);
            };
        }

        private Predicate buildClubFieldIn(Join<?, ?> clubJoin, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "name", "shortName" -> QueryAdapterHelpers.stringInPredicate(clubJoin, cb, field, values);
                default -> throw new IllegalArgumentException("In operator not supported for club field: " + field);
            };
        }

        private Predicate buildRegularFieldPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            return switch (field) {
                case "athleteId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "athleteId", op, valueRaw);
                case "clubId" -> QueryAdapterHelpers.uuidPredicate(root, cb, "clubId", op, valueRaw);
                case "year", "accreditationYear" -> QueryAdapterHelpers.integerPredicate(root, cb, "year", op, valueRaw);
                case "status", "accreditationStatus" -> enumPredicate(root, cb, "status", op, valueRaw);
                case "accreditationNumber" -> QueryAdapterHelpers.stringPredicate(root, cb, "accreditationNumber", op, valueRaw);
                case "createdAt" -> QueryAdapterHelpers.instantPredicate(root, cb, "createdAt", op, valueRaw);
                case "dateOfBirth", "athleteDateOfBirth" -> {
                    Join<Accreditation, Athlete> athleteJoin = root.join("athlete", JoinType.INNER);
                    yield QueryAdapterHelpers.datePredicate(athleteJoin, cb, "dateOfBirth", op, valueRaw);
                }
                default -> throw new IllegalArgumentException("Unsupported filter field: " + field);
            };
        }

        private Predicate buildRegularFieldRange(Root<Accreditation> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            return switch (field) {
                case "year" -> QueryAdapterHelpers.integerRangePredicate(root, cb, "year", minValue, maxValue);
                case "createdAt" -> QueryAdapterHelpers.instantRangePredicate(root, cb, "createdAt", minValue, maxValue);
                default -> throw new IllegalArgumentException("Range operator not supported for field: " + field);
            };
        }

        private Predicate buildRegularFieldIn(Root<Accreditation> root, CriteriaBuilder cb, String field, List<String> values) {
            return switch (field) {
                case "athleteId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "athleteId", values);
                case "clubId" -> QueryAdapterHelpers.uuidInPredicate(root, cb, "clubId", values);
                case "status", "accreditationStatus" -> enumInPredicate(root, cb, "status", values);
                case "year" -> QueryAdapterHelpers.integerInPredicate(root, cb, "year", values);
                default -> throw new IllegalArgumentException("In operator not supported for field: " + field);
            };
        }

        private Predicate enumPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, String op, String valueRaw) {
            String value = QueryAdapterHelpers.parseString(valueRaw);
            AccreditationStatus status;
            try {
                status = AccreditationStatus.fromValue(value);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid accreditation status value: " + valueRaw);
            }
            Expression<AccreditationStatus> expr = root.get(field);

            return switch (op) {
                case "eq" -> cb.equal(expr, status);
                case "ne" -> cb.notEqual(expr, status);
                default -> throw new IllegalArgumentException("Operator '" + op + "' is not supported for field '" + field + "'");
            };
        }

        private Predicate enumInPredicate(Root<Accreditation> root, CriteriaBuilder cb, String field, List<String> values) {
            Expression<AccreditationStatus> expr = root.get(field);
            List<Predicate> predicates = new ArrayList<>();
            for (String value : values) {
                String v = QueryAdapterHelpers.parseString(value);
                AccreditationStatus status;
                try {
                    status = AccreditationStatus.fromValue(v);
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Invalid accreditation status value: " + value);
                }
                predicates.add(cb.equal(expr, status));
            }
            return cb.or(predicates.toArray(new Predicate[0]));
        }
    }

    private static Predicate buildSearchPredicate(
            Root<Accreditation> root,
            Join<Accreditation, Athlete> athleteJoin,
            Join<Accreditation, Club> clubJoin,
            CriteriaBuilder cb,
            String token
    ) {
        String normalized = token.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        String likeValue = "%" + normalized.toLowerCase(Locale.ROOT) + "%";
        List<Predicate> fieldPredicates = new ArrayList<>();
        fieldPredicates.add(cb.like(cb.lower(athleteJoin.get("firstName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(athleteJoin.get("middleName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(athleteJoin.get("lastName").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(clubJoin.get("name").as(String.class)), likeValue));
        fieldPredicates.add(cb.like(cb.lower(root.get("accreditationNumber").as(String.class)), likeValue));
        LocalDate date = QueryAdapterHelpers.tryParseDate(normalized);
        if (date != null) {
            fieldPredicates.add(cb.equal(athleteJoin.get("dateOfBirth"), date));
        }
        return cb.or(fieldPredicates.toArray(new Predicate[0]));
    }
}
