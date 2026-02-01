package com.bfg.platform.common.query;

import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public final class EnhancedSortParser {
    
    private EnhancedSortParser() {
        throw new IllegalStateException("Utility class");
    }
    
    public static class ParseResult {
        private final Sort sort;
        private final Set<String> usedExpandFields;
        
        private ParseResult(Sort sort, Set<String> usedExpandFields) {
            this.sort = sort;
            this.usedExpandFields = Collections.unmodifiableSet(usedExpandFields);
        }
        
        public Sort getSort() {
            return sort;
        }
        
        public Set<String> getUsedExpandFields() {
            return usedExpandFields;
        }
    }
    
    public static ParseResult parse(
            List<String> orderByList,
            Map<String, Sort.Order> allowed,
            Sort defaultSort,
            Class<?> entityClass,
            Set<String> requestedExpand
    ) {
        if (orderByList == null || orderByList.isEmpty()) {
            return new ParseResult(defaultSort, Collections.emptySet());
        }
        
        String orderByStr = orderByList.stream()
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining(","));
        
        return parse(orderByStr, allowed, defaultSort, entityClass, requestedExpand);
    }
    
    public static ParseResult parse(
            String raw,
            Map<String, Sort.Order> allowed,
            Sort defaultSort,
            Class<?> entityClass,
            Set<String> requestedExpand
    ) {
        if (raw == null || raw.isBlank()) {
            return new ParseResult(defaultSort, Collections.emptySet());
        }
        
        String[] parts = raw.split(",");
        LinkedHashMap<String, Sort.Order> orders = new LinkedHashMap<>();
        HashMap<String, Sort.Direction> directions = new HashMap<>();
        Set<String> usedExpandFields = new HashSet<>();
        
        for (String part : parts) {
            String token = part.trim();
            if (token.isEmpty()) continue;
            
            Sort.Order order = fromToken(token, allowed, entityClass, requestedExpand, usedExpandFields);
            String prop = order.getProperty();
            Sort.Direction dir = order.getDirection();
            
            if (directions.containsKey(prop)) {
                Sort.Direction existing = directions.get(prop);
                if (existing != dir) {
                    throw new IllegalArgumentException(
                        "Conflicting sort directions for field '" + prop + "': " + existing + " and " + dir
                    );
                }
                throw new IllegalArgumentException("Duplicate sort for field: " + prop);
            }
            
            directions.put(prop, dir);
            orders.put(prop, order);
        }
        
        if (orders.isEmpty()) {
            return new ParseResult(defaultSort, Collections.emptySet());
        }
        
        return new ParseResult(
                Sort.by(new ArrayList<>(orders.values())),
                usedExpandFields
        );
    }
    
    private static Sort.Order fromToken(
            String raw,
            Map<String, Sort.Order> allowed,
            Class<?> entityClass,
            Set<String> requestedExpand,
            Set<String> usedExpandFields
    ) {
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        
        for (Map.Entry<String, Sort.Order> entry : allowed.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(normalized)) {
                return entry.getValue();
            }
        }
        
        if (normalized.contains(".")) {
            String[] parts = normalized.split("_");
            if (parts.length != 2) {
                throw new IllegalArgumentException("Invalid sort format: " + raw + ". Expected: field_direction");
            }
            
            String fieldPath = parts[0];
            String directionStr = parts[1];
            
            String expandField = extractExpandField(fieldPath);
            if (expandField != null) {
                if (requestedExpand.isEmpty() || !requestedExpand.contains(expandField)) {
                    throw new IllegalArgumentException(
                        "Cannot sort by expanded field '" + fieldPath + "' without expanding '" + expandField + "'"
                    );
                }
                usedExpandFields.add(expandField);
            }
            
            Sort.Direction direction;
            if ("asc".equals(directionStr)) {
                direction = Sort.Direction.ASC;
            } else if ("desc".equals(directionStr)) {
                direction = Sort.Direction.DESC;
            } else {
                throw new IllegalArgumentException("Invalid sort direction: " + directionStr + ". Expected 'asc' or 'desc'");
            }
            
            return new Sort.Order(direction, fieldPath);
        }
        
        throw new IllegalArgumentException("Invalid order: " + raw);
    }
    
    private static String extractExpandField(String fieldPath) {
        if (fieldPath == null || !fieldPath.contains(".")) {
            return null;
        }
        int dotIndex = fieldPath.indexOf('.');
        return fieldPath.substring(0, dotIndex);
    }
}

