package com.bfg.platform.common.repository;

import com.bfg.platform.common.query.ExpandConfig;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;

import java.util.Set;

public final class DynamicEntityGraph {
    
    private DynamicEntityGraph() {
        throw new IllegalStateException("Utility class");
    }
    
    public static <T> EntityGraph<T> create(EntityManager entityManager, Class<T> entityClass, Set<String> expandFields) {
        if (expandFields == null || expandFields.isEmpty()) {
            return null;
        }
        
        Set<String> expandableFields = ExpandConfig.getExpandableFields(entityClass);
        for (String field : expandFields) {
            if (!expandableFields.contains(field)) {
                throw new IllegalArgumentException(
                    "Field '" + field + "' is not expandable for " + entityClass.getSimpleName()
                );
            }
        }
        
        EntityGraph<T> graph = entityManager.createEntityGraph(entityClass);
        
        for (String field : expandFields) {
            graph.addAttributeNodes(field);
        }
        
        return graph;
    }
}

