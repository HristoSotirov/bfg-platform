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

        Set<String> invalid = new HashSet<>();

        for (String field : requested) {
            if (!isValidExpandPath(field, entityClass)) {
                invalid.add(field);
            }
        }

        if (!invalid.isEmpty()) {
            throw new IllegalArgumentException(
                "Invalid expand options for " + entityClass.getSimpleName() + ": " + invalid
            );
        }

        // Validate that parent is explicitly expanded when using nested paths
        for (String field : requested) {
            if (field.contains(".")) {
                String parent = field.substring(0, field.lastIndexOf('.'));
                if (!requested.contains(parent)) {
                    throw new IllegalArgumentException(
                        "Cannot expand '" + field + "' without also expanding '" + parent + "'"
                    );
                }
            }
        }

        return requested;
    }

    /**
     * Validates a dotted expand path by walking the ExpandConfig chain segment by segment.
     * E.g. "discipline.competitionGroup.transferFromGroup" on CompetitionTimetableEvent:
     *   1. "discipline" valid on CompetitionTimetableEvent → resolves to DisciplineDefinition
     *   2. "competitionGroup" valid on DisciplineDefinition → resolves to CompetitionGroupDefinition
     *   3. "transferFromGroup" valid on CompetitionGroupDefinition → valid
     */
    private static boolean isValidExpandPath(String path, Class<?> rootEntityClass) {
        String[] segments = path.split("\\.");
        Class<?> currentClass = rootEntityClass;

        for (String segment : segments) {
            if (!ExpandConfig.isExpandable(currentClass, segment)) {
                return false;
            }
            Class<?> nextClass = ExpandConfig.getExpandableFieldType(currentClass, segment);
            if (nextClass == null) {
                return false;
            }
            currentClass = nextClass;
        }
        return true;
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

    /**
     * Strips a prefix from dotted expand keys and returns the child-level expand set.
     * E.g. subExpand({"competitionGroup", "competitionGroup.transferFromGroup"}, "competitionGroup")
     *   → {"transferFromGroup"}
     */
    public static Set<String> subExpand(Set<String> expand, String prefix) {
        if (expand == null || expand.isEmpty()) {
            return Collections.emptySet();
        }
        String dotPrefix = prefix + ".";
        return expand.stream()
                .filter(s -> s.startsWith(dotPrefix))
                .map(s -> s.substring(dotPrefix.length()))
                .collect(Collectors.toSet());
    }
}

