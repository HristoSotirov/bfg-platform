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
            if (!expandableFields.contains(field)) {
                invalid.add(field);
            }
        }
        
        if (!invalid.isEmpty()) {
            throw new IllegalArgumentException(
                "Invalid expand options for " + entityClass.getSimpleName() + ": " + invalid +
                ". Available options: " + expandableFields
            );
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

