package com.bfg.platform.common.repository;

import com.bfg.platform.common.query.ExpandConfig;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;

import java.util.Set;

/**
 * Utility for creating dynamic EntityGraph based on expand parameter.
 */
public final class DynamicEntityGraph {
    
    private DynamicEntityGraph() {
        throw new IllegalStateException("Utility class");
    }
    
    /**
     * Create an EntityGraph for the given entity class and expand fields.
     * 
     * @param entityManager The entity manager
     * @param entityClass The entity class
     * @param expandFields Set of fields to expand
     * @return EntityGraph or null if no expand fields
     */
    public static <T> EntityGraph<T> create(EntityManager entityManager, Class<T> entityClass, Set<String> expandFields) {
        if (expandFields == null || expandFields.isEmpty()) {
            return null;
        }
        
        // Validate expand fields
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

