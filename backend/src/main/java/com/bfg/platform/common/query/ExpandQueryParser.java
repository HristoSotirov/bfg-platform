package com.bfg.platform.common.query;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public final class ExpandQueryParser {
    
    private ExpandQueryParser() {
        throw new IllegalStateException("Utility class");
    }
    
    public static Set<String> parse(List<String> expandList, Class<?> entityClass) {
        if (expandList == null || expandList.isEmpty()) {
            return Collections.emptySet();
        }
        
        String expandParam = expandList.stream()
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining(","));
        
        return parse(expandParam, entityClass);
    }
    
    public static Set<String> parse(String expandParam, Class<?> entityClass) {
        if (expandParam == null || expandParam.isBlank()) {
            return Collections.emptySet();
        }
        
        Set<String> requested = Stream.of(expandParam.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
        
        if (requested.isEmpty()) {
            return Collections.emptySet();
        }
        
        Set<String> expandableFields = ExpandConfig.getExpandableFields(entityClass);
        Set<String> invalid = new HashSet<>();
        
        for (String field : requested) {
            String rootField = field.contains(".") ? field.substring(0, field.indexOf('.')) : field;
            if (!expandableFields.contains(rootField)) {
                invalid.add(field);
            }
        }
        
        if (!invalid.isEmpty()) {
            throw new IllegalArgumentException(
                "Invalid expand options for " + entityClass.getSimpleName() + ": " + invalid +
                ". Available options: " + expandableFields
            );
        }

        // Validate that parent is explicitly expanded when using nested paths
        // e.g. discipline.competitionGroup requires discipline to also be present
        for (String field : requested) {
            if (field.contains(".")) {
                String parent = field.substring(0, field.indexOf('.'));
                if (!requested.contains(parent)) {
                    throw new IllegalArgumentException(
                        "Cannot expand '" + field + "' without also expanding '" + parent + "'"
                    );
                }
            }
        }

        return requested;
    }
    
    public static Set<String> parseWithoutValidation(String expandParam) {
        if (expandParam == null || expandParam.isBlank()) {
            return Collections.emptySet();
        }
        
        return Stream.of(expandParam.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }
}

