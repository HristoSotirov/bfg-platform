package com.bfg.platform.common.query;

import jakarta.persistence.criteria.JoinType;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public final class ExpandConfig {
    
    private static final Map<Class<?>, EntityExpandConfig> CONFIGS = new HashMap<>();
    
    static {
        register(com.bfg.platform.athlete.entity.Accreditation.class, EntityExpandConfig.builder()
                .addExpandableField("athlete", com.bfg.platform.athlete.entity.Athlete.class, JoinType.LEFT)
                .addExpandableField("club", com.bfg.platform.club.entity.Club.class, JoinType.LEFT)
                .build());
        
        register(com.bfg.platform.club.entity.Club.class, EntityExpandConfig.builder()
                .addExpandableField("clubAdminUser", com.bfg.platform.user.entity.User.class, JoinType.LEFT)
                .build());
        
        register(com.bfg.platform.athlete.entity.Athlete.class, EntityExpandConfig.builder().build());
        
        register(com.bfg.platform.user.entity.User.class, EntityExpandConfig.builder().build());
        
        register(com.bfg.platform.club.entity.ClubCoach.class, EntityExpandConfig.builder()
                .addExpandableField("coach", com.bfg.platform.user.entity.User.class, JoinType.LEFT)
                .addExpandableField("club", com.bfg.platform.club.entity.Club.class, JoinType.LEFT)
                .build());
        
        register(com.bfg.platform.athlete.entity.AthletePhotoHistory.class, EntityExpandConfig.builder()
                .addExpandableField("uploadedByClub", com.bfg.platform.club.entity.Club.class, JoinType.LEFT)
                .build());
    }
    
    private ExpandConfig() {
        throw new IllegalStateException("Utility class");
    }
    
    private static void register(Class<?> entityClass, EntityExpandConfig config) {
        CONFIGS.put(entityClass, config);
    }
    
    public static Set<String> getExpandableFields(Class<?> entityClass) {
        EntityExpandConfig config = CONFIGS.get(entityClass);
        if (config == null) {
            return Collections.emptySet();
        }
        return config.getExpandableFields();
    }
    
    public static boolean isExpandable(Class<?> entityClass, String fieldName) {
        EntityExpandConfig config = CONFIGS.get(entityClass);
        if (config == null) {
            return false;
        }
        return config.isExpandable(fieldName);
    }
    
    public static Class<?> getExpandableFieldType(Class<?> entityClass, String fieldName) {
        EntityExpandConfig config = CONFIGS.get(entityClass);
        if (config == null) {
            return null;
        }
        return config.getFieldType(fieldName);
    }
    
    public static JoinType getJoinType(Class<?> entityClass, String fieldName) {
        EntityExpandConfig config = CONFIGS.get(entityClass);
        if (config == null) {
            return JoinType.LEFT;
        }
        return config.getJoinType(fieldName);
    }
    
    private static class EntityExpandConfig {
        private final Map<String, FieldConfig> fields;
        
        private EntityExpandConfig(Map<String, FieldConfig> fields) {
            this.fields = Map.copyOf(fields);
        }
        
        public Set<String> getExpandableFields() {
            return fields.keySet();
        }
        
        public boolean isExpandable(String fieldName) {
            return fields.containsKey(fieldName);
        }
        
        public Class<?> getFieldType(String fieldName) {
            FieldConfig config = fields.get(fieldName);
            return config != null ? config.entityType : null;
        }
        
        public JoinType getJoinType(String fieldName) {
            FieldConfig config = fields.get(fieldName);
            return config != null ? config.joinType : JoinType.LEFT;
        }
        
        static Builder builder() {
            return new Builder();
        }
        
        static class Builder {
            private final Map<String, FieldConfig> fields = new HashMap<>();
            
            Builder addExpandableField(String fieldName, Class<?> entityType, JoinType joinType) {
                fields.put(fieldName, new FieldConfig(fieldName, entityType, joinType));
                return this;
            }
            
            EntityExpandConfig build() {
                return new EntityExpandConfig(fields);
            }
        }
        
        private static class FieldConfig {
            final String fieldName;
            final Class<?> entityType;
            final JoinType joinType;
            
            FieldConfig(String fieldName, Class<?> entityType, JoinType joinType) {
                this.fieldName = fieldName;
                this.entityType = entityType;
                this.joinType = joinType;
            }
        }
    }
}

