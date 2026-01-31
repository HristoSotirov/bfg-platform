package com.bfg.platform.common.query;

import com.bfg.platform.gen.model.FacetOption;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class FacetQueryService {
    private final EntityManager entityManager;

    public <T> List<FacetOption> buildFacetOptions(Class<T> entityClass, Specification<T> spec, String field) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<T> root = query.from(entityClass);

        Predicate predicate = spec != null ? spec.toPredicate(root, query, cb) : cb.conjunction();
        Path<Object> path = resolvePath(root, field);
        query.multiselect(
                path.alias("value"),
                cb.count(root).alias("count")
        );
        if (predicate != null) {
            query.where(predicate);
        }
        query.groupBy(path);
        query.orderBy(cb.asc(path));

        List<Tuple> results = entityManager.createQuery(query).getResultList();
        return results.stream()
                .filter(t -> t.get("value") != null)
                .map(t -> new FacetOption()
                        .value(String.valueOf(t.get("value")))
                        .count(((Number) t.get("count")).intValue()))
                .toList();
    }

    public <T> DateRange buildDateRange(Class<T> entityClass, Specification<T> spec, String field) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<T> root = query.from(entityClass);

        Predicate predicate = spec != null ? spec.toPredicate(root, query, cb) : cb.conjunction();
        Expression<LocalDate> path = resolvePath(root, field);
        query.multiselect(
                cb.least(path).alias("min"),
                cb.greatest(path).alias("max")
        );
        if (predicate != null) {
            query.where(predicate);
        }

        Tuple result = entityManager.createQuery(query).getSingleResult();
        return new DateRange(
                result.get("min", LocalDate.class),
                result.get("max", LocalDate.class)
        );
    }

    @SuppressWarnings("unchecked")
    private <T> Path<T> resolvePath(Root<?> root, String fieldPath) {
        if (fieldPath == null || fieldPath.isBlank()) {
            throw new IllegalArgumentException("Facet field path is required");
        }
        String[] parts = fieldPath.split("\\.");
        Path<?> current = root;
        for (String part : parts) {
            current = current.get(part);
        }
        return (Path<T>) current;
    }
}

