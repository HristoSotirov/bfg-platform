package com.bfg.platform.common.query;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Root;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public final class ExpandQueryBuilder {
    
    private ExpandQueryBuilder() {
        throw new IllegalStateException("Utility class");
    }
    
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
        
        @SuppressWarnings("unchecked")
        public <T, R> Join<T, R> getOrCreateJoin(String fieldName, Class<R> targetEntityClass) {
            boolean needsJoin = requestedExpand.contains(fieldName) ||
                               usedInFilter.contains(fieldName) ||
                               usedInSort.contains(fieldName);
            
            if (!needsJoin) {
                return null;
            }
            
            Join<?, ?> existing = joins.get(fieldName);
            if (existing != null) {
                return (Join<T, R>) existing;
            }
            
            JoinType joinType = ExpandConfig.getJoinType(root.getJavaType(), fieldName);
            Join<T, R> join = ((Root<T>) root).join(fieldName, joinType);
            joins.put(fieldName, join);
            
            return join;
        }
        
        @SuppressWarnings("unchecked")
        public <T, R> Join<T, R> getJoin(String fieldName) {
            return (Join<T, R>) joins.get(fieldName);
        }
        
        public boolean needsJoin(String fieldName) {
            return requestedExpand.contains(fieldName) ||
                   usedInFilter.contains(fieldName) ||
                   usedInSort.contains(fieldName);
        }
        
        public Map<String, Join<?, ?>> getAllJoins() {
            return Map.copyOf(joins);
        }
    }
    
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

