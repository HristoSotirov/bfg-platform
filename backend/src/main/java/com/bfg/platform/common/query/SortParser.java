package com.bfg.platform.common.query;

import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

public final class SortParser {
    private SortParser() {
        throw new IllegalStateException("Utility class");
    }

    public static Sort parse(String raw, Map<String, Sort.Order> allowed, Sort defaultSort) {
        if (raw == null || raw.isBlank()) {
            return defaultSort;
        }
        String[] parts = raw.split(",");
        LinkedHashMap<String, Sort.Order> orders = new LinkedHashMap<>();
        HashMap<String, Sort.Direction> directions = new HashMap<>();

        for (String part : parts) {
            String token = part.trim();
            if (token.isEmpty()) continue;
            Sort.Order order = fromToken(token, allowed);
            String prop = order.getProperty();
            Sort.Direction dir = order.getDirection();
            if (directions.containsKey(prop)) {
                Sort.Direction existing = directions.get(prop);
                if (existing != dir) {
                    throw new IllegalArgumentException("Conflicting sort for field: " + prop);
                }
                throw new IllegalArgumentException("Duplicate sort for field: " + prop);
            }
            directions.put(prop, dir);
            orders.put(prop, order);
        }

        if (orders.isEmpty()) {
            return defaultSort;
        }
        return Sort.by(new ArrayList<>(orders.values()));
    }

    private static Sort.Order fromToken(String raw, Map<String, Sort.Order> allowed) {
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        for (Map.Entry<String, Sort.Order> entry : allowed.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(normalized)) {
                return entry.getValue();
            }
        }
        throw new IllegalArgumentException("Invalid order: " + raw);
    }
}

