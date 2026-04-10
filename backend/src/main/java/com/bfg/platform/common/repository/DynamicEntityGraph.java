package com.bfg.platform.common.repository;

import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Subgraph;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public final class DynamicEntityGraph {

    private DynamicEntityGraph() {
        throw new IllegalStateException("Utility class");
    }

    /**
     * Creates a JPA EntityGraph from a set of expand field paths.
     * Supports dotted paths for nested subgraphs (e.g. "discipline.competitionGroup").
     * Validation of field names is the caller's responsibility (use ExpandQueryParser first).
     */
    public static <T> EntityGraph<T> create(EntityManager entityManager, Class<T> entityClass, Set<String> expandFields) {
        if (expandFields == null || expandFields.isEmpty()) {
            return null;
        }

        EntityGraph<T> graph = entityManager.createEntityGraph(entityClass);
        // Cache subgraphs keyed by path, e.g. "discipline" -> Subgraph
        Map<String, Subgraph<?>> subgraphCache = new HashMap<>();

        // Pass 1: process dotted paths, building subgraphs
        for (String field : expandFields) {
            if (!field.contains(".")) {
                continue;
            }
            String[] segments = field.split("\\.");
            String parentPath = segments[0];

            Subgraph<?> subgraph = subgraphCache.get(parentPath);
            if (subgraph == null) {
                subgraph = graph.addSubgraph(parentPath);
                subgraphCache.put(parentPath, subgraph);
            }

            for (int i = 1; i < segments.length - 1; i++) {
                String currentPath = parentPath + "." + segments[i];
                Subgraph<?> nested = subgraphCache.get(currentPath);
                if (nested == null) {
                    nested = subgraph.addSubgraph(segments[i]);
                    subgraphCache.put(currentPath, nested);
                }
                subgraph = nested;
                parentPath = currentPath;
            }

            subgraph.addAttributeNodes(segments[segments.length - 1]);
        }

        // Pass 2: flat fields — only add as attribute node if no subgraph was already created for them
        for (String field : expandFields) {
            if (!field.contains(".") && !subgraphCache.containsKey(field)) {
                graph.addAttributeNodes(field);
            }
        }

        return graph;
    }
}
