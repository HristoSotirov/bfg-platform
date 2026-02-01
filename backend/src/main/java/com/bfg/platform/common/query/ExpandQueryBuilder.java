package com.bfg.platform.common.query;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Root;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Utility class for building conditional JOINs based on expand and filter/sort usage.
 * Manages JOIN creation and reuse to avoid duplicate joins.
 */
public final class ExpandQueryBuilder {
    
    private ExpandQueryBuilder() {
        throw new IllegalStateException("Utility class");
    }
    
    /**
     * Context for managing joins during query building.
     */
    public static class JoinContext {
        private final Root<?> root;
        private final Map<String, Join<?, ?>> joins = new HashMap<>();
        private final Set<String> requestedExpand;
        private final Set<String> usedInFilter;
        private final Set<String> usedInSort;
        
        public JoinContext(
                Root<?> root,
                CriteriaQuery<?> query,
                CriteriaBuilder cb,
                Set<String> requestedExpand,
                Set<String> usedInFilter,
                Set<String> usedInSort
        ) {
            this.root = root;
            this.requestedExpand = requestedExpand != null ? requestedExpand : Set.of();
            this.usedInFilter = usedInFilter != null ? usedInFilter : Set.of();
            this.usedInSort = usedInSort != null ? usedInSort : Set.of();
        }
        
        /**
         * Get or create a JOIN for an expandable field.
         * JOIN is created if:
         * - Field is in requested expand, OR
         * - Field is used in filter, OR
         * - Field is used in sort
         */
        @SuppressWarnings("unchecked")
        public <T, R> Join<T, R> getOrCreateJoin(String fieldName, Class<R> targetEntityClass) {
            // Check if join is needed
            boolean needsJoin = requestedExpand.contains(fieldName) ||
                               usedInFilter.contains(fieldName) ||
                               usedInSort.contains(fieldName);
            
            if (!needsJoin) {
                return null;
            }
            
            // Return existing join if available
            Join<?, ?> existing = joins.get(fieldName);
            if (existing != null) {
                return (Join<T, R>) existing;
            }
            
            // Create new join
            JoinType joinType = ExpandConfig.getJoinType(root.getJavaType(), fieldName);
            Join<T, R> join = ((Root<T>) root).join(fieldName, joinType);
            joins.put(fieldName, join);
            
            return join;
        }
        
        /**
         * Get an existing join without creating a new one.
         */
        @SuppressWarnings("unchecked")
        public <T, R> Join<T, R> getJoin(String fieldName) {
            return (Join<T, R>) joins.get(fieldName);
        }
        
        /**
         * Check if a field needs to be joined.
         */
        public boolean needsJoin(String fieldName) {
            return requestedExpand.contains(fieldName) ||
                   usedInFilter.contains(fieldName) ||
                   usedInSort.contains(fieldName);
        }
        
        /**
         * Get all created joins.
         */
        public Map<String, Join<?, ?>> getAllJoins() {
            return Map.copyOf(joins);
        }
    }
    
    /**
     * Create a join context for building queries.
     */
    public static JoinContext createContext(
            Root<?> root,
            CriteriaQuery<?> query,
            CriteriaBuilder cb,
            Set<String> requestedExpand,
            Set<String> usedInFilter,
            Set<String> usedInSort
    ) {
        return new JoinContext(root, query, cb, requestedExpand, usedInFilter, usedInSort);
    }
}

