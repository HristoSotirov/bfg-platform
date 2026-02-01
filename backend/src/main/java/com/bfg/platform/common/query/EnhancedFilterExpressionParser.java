package com.bfg.platform.common.query;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Enhanced filter expression parser that supports:
 * - Dot notation for expanded fields (e.g., athlete.dateOfBirth)
 * - Range operator (e.g., field range 'min' to 'max')
 * - In operator (e.g., field in ('value1', 'value2'))
 * - Tracks which expanded fields are used in filters
 */
public final class EnhancedFilterExpressionParser {
    
    private EnhancedFilterExpressionParser() {
        throw new IllegalStateException("Utility class");
    }
    
    /**
     * Result of parsing a filter expression.
     */
    public static class ParseResult<T> {
        private final Specification<T> specification;
        private final Set<String> usedExpandFields;
        
        private ParseResult(Specification<T> specification, Set<String> usedExpandFields) {
            this.specification = specification;
            this.usedExpandFields = Collections.unmodifiableSet(usedExpandFields);
        }
        
        public Specification<T> getSpecification() {
            return specification;
        }
        
        public Set<String> getUsedExpandFields() {
            return usedExpandFields;
        }
    }
    
    @FunctionalInterface
    public interface EnhancedPredicateBuilder<T> {
        Predicate build(Root<T> root, CriteriaBuilder cb, String field, String operator, String valueRaw);
        
        /**
         * Build predicate for range operator.
         * @param field Field name (may contain dot notation)
         * @param minValue Minimum value (empty string if unbounded)
         * @param maxValue Maximum value (empty string if unbounded)
         */
        default Predicate buildRange(Root<T> root, CriteriaBuilder cb, String field, String minValue, String maxValue) {
            throw new UnsupportedOperationException("Range operator not supported for field: " + field);
        }
        
        /**
         * Build predicate for in operator.
         * @param field Field name (may contain dot notation)
         * @param values List of values to match
         */
        default Predicate buildIn(Root<T> root, CriteriaBuilder cb, String field, List<String> values) {
            throw new UnsupportedOperationException("In operator not supported for field: " + field);
        }
    }
    
    /**
     * Parse filter expression with enhanced features.
     * 
     * @param filter The filter expression string
     * @param predicateBuilder Builder for creating predicates
     * @param entityClass The entity class
     * @param requestedExpand Set of requested expand fields (for validation)
     * @return Parse result with specification and used expand fields
     */
    public static <T> ParseResult<T> parse(
            String filter,
            EnhancedPredicateBuilder<T> predicateBuilder,
            Class<T> entityClass,
            Set<String> requestedExpand
    ) {
        if (filter == null || filter.isBlank()) {
            return new ParseResult<>(Specification.where(null), Collections.emptySet());
        }
        
        FilterTokenizer tokenizer = new FilterTokenizer(filter);
        List<FilterToken> tokens = tokenizer.tokenize();
        EnhancedExpressionParser<T> parser = new EnhancedExpressionParser<>(
                tokens, predicateBuilder, entityClass, requestedExpand);
        FilterExpression<T> expression = parser.parse();
        
        return new ParseResult<>(
                expression.toSpecification(),
                parser.getUsedExpandFields()
        );
    }
    
    /**
     * Extract the base expand field from a dot-notation field path.
     * Example: "athlete.dateOfBirth" -> "athlete"
     */
    public static String extractExpandField(String fieldPath) {
        if (fieldPath == null || !fieldPath.contains(".")) {
            return null;
        }
        int dotIndex = fieldPath.indexOf('.');
        return fieldPath.substring(0, dotIndex);
    }
    
    private interface FilterExpression<T> {
        Specification<T> toSpecification();
    }
    
    private static final class OrExpression<T> implements FilterExpression<T> {
        private final FilterExpression<T> left;
        private final FilterExpression<T> right;
        
        OrExpression(FilterExpression<T> left, FilterExpression<T> right) {
            this.left = left;
            this.right = right;
        }
        
        @Override
        public Specification<T> toSpecification() {
            return left.toSpecification().or(right.toSpecification());
        }
    }
    
    private static final class AndExpression<T> implements FilterExpression<T> {
        private final FilterExpression<T> left;
        private final FilterExpression<T> right;
        
        AndExpression(FilterExpression<T> left, FilterExpression<T> right) {
            this.left = left;
            this.right = right;
        }
        
        @Override
        public Specification<T> toSpecification() {
            return left.toSpecification().and(right.toSpecification());
        }
    }
    
    private static final class ComparisonExpression<T> implements FilterExpression<T> {
        private final String field;
        private final String operator;
        private final String value;
        private final EnhancedPredicateBuilder<T> predicateBuilder;
        
        ComparisonExpression(String field, String operator, String value, EnhancedPredicateBuilder<T> predicateBuilder) {
            this.field = field;
            this.operator = operator;
            this.value = value;
            this.predicateBuilder = predicateBuilder;
        }
        
        @Override
        public Specification<T> toSpecification() {
            return (root, query, cb) -> predicateBuilder.build(root, cb, field, operator, value);
        }
    }
    
    private static final class RangeExpression<T> implements FilterExpression<T> {
        private final String field;
        private final String minValue;
        private final String maxValue;
        private final EnhancedPredicateBuilder<T> predicateBuilder;
        
        RangeExpression(String field, String minValue, String maxValue, EnhancedPredicateBuilder<T> predicateBuilder) {
            this.field = field;
            this.minValue = minValue;
            this.maxValue = maxValue;
            this.predicateBuilder = predicateBuilder;
        }
        
        @Override
        public Specification<T> toSpecification() {
            return (root, query, cb) -> predicateBuilder.buildRange(root, cb, field, minValue, maxValue);
        }
    }
    
    private static final class InExpression<T> implements FilterExpression<T> {
        private final String field;
        private final List<String> values;
        private final EnhancedPredicateBuilder<T> predicateBuilder;
        
        InExpression(String field, List<String> values, EnhancedPredicateBuilder<T> predicateBuilder) {
            this.field = field;
            this.values = values;
            this.predicateBuilder = predicateBuilder;
        }
        
        @Override
        public Specification<T> toSpecification() {
            return (root, query, cb) -> predicateBuilder.buildIn(root, cb, field, values);
        }
    }
    
    private static final class EnhancedExpressionParser<T> {
        private final List<FilterToken> tokens;
        private final EnhancedPredicateBuilder<T> predicateBuilder;
        private final Set<String> requestedExpand;
        private final Set<String> usedExpandFields = new HashSet<>();
        private int current;
        
        EnhancedExpressionParser(
                List<FilterToken> tokens,
                EnhancedPredicateBuilder<T> predicateBuilder,
                Class<T> entityClass,
                Set<String> requestedExpand
        ) {
            this.tokens = tokens;
            this.predicateBuilder = predicateBuilder;
            this.requestedExpand = requestedExpand != null ? requestedExpand : Collections.emptySet();
            this.current = 0;
        }
        
        Set<String> getUsedExpandFields() {
            return usedExpandFields;
        }
        
        FilterExpression<T> parse() {
            FilterExpression<T> expr = parseOrExpression();
            if (peek().getType() != FilterTokenType.EOF) {
                throw new IllegalArgumentException("Unexpected token at position " + peek().getPosition() + ": " + peek());
            }
            return expr;
        }
        
        private FilterExpression<T> parseOrExpression() {
            FilterExpression<T> left = parseAndExpression();
            
            while (match(FilterTokenType.OR)) {
                FilterExpression<T> right = parseAndExpression();
                left = new OrExpression<>(left, right);
            }
            
            return left;
        }
        
        private FilterExpression<T> parseAndExpression() {
            FilterExpression<T> left = parseComparisonOrGroup();
            
            while (match(FilterTokenType.AND)) {
                FilterExpression<T> right = parseComparisonOrGroup();
                left = new AndExpression<>(left, right);
            }
            
            return left;
        }
        
        private FilterExpression<T> parseComparisonOrGroup() {
            if (match(FilterTokenType.LEFT_PAREN)) {
                FilterExpression<T> expr = parseOrExpression();
                if (!match(FilterTokenType.RIGHT_PAREN)) {
                    throw new IllegalArgumentException("Expected ')' at position " + peek().getPosition());
                }
                return expr;
            }
            
            return parseComparison();
        }
        
        private FilterExpression<T> parseComparison() {
            FilterToken fieldToken = consume(FilterTokenType.FIELD, "Expected field name");
            String field = fieldToken.getValue();
            
            // Check if field uses dot notation (expanded field)
            String expandField = extractExpandField(field);
            if (expandField != null) {
                // Validate that expand is requested (silent skip if not)
                if (requestedExpand.isEmpty() || !requestedExpand.contains(expandField)) {
                    // Return a no-op specification (always true)
                    return new ComparisonExpression<>("", "eq", "true", (r, cb, f, op, v) -> cb.conjunction());
                }
                usedExpandFields.add(expandField);
            }
            
            FilterToken opToken = peek();
            
            // Check for range operator (tokenized as FIELD)
            if (opToken.getType() == FilterTokenType.FIELD && "range".equalsIgnoreCase(opToken.getValue())) {
                return parseRangeExpression(field);
            }
            
            // Check for in operator
            if (opToken.getType() == FilterTokenType.COMPARISON_OP && "in".equals(opToken.getValue())) {
                return parseInExpression(field);
            }
            
            // Regular comparison operator
            if (opToken.getType() != FilterTokenType.COMPARISON_OP) {
                throw new IllegalArgumentException("Expected comparison operator at position " + opToken.getPosition());
            }
            advance(); // consume the operator
            String operator = opToken.getValue();
            
            String value;
            if (check(FilterTokenType.VALUE)) {
                FilterToken valueToken = advance();
                value = valueToken.getValue();
            } else if (check(FilterTokenType.FIELD)) {
                FilterToken valueToken = advance();
                value = valueToken.getValue();
            } else {
                throw new IllegalArgumentException("Expected value at position " + peek().getPosition());
            }
            
            return new ComparisonExpression<>(field, operator, value, predicateBuilder);
        }
        
        private FilterExpression<T> parseRangeExpression(String field) {
            // Consume "range" keyword (already peeked)
            advance();
            
            // Parse min value
            String minValue = "";
            if (check(FilterTokenType.VALUE)) {
                FilterToken minToken = advance();
                minValue = minToken.getValue();
            } else if (check(FilterTokenType.FIELD)) {
                // Could be empty string or "to" - check
                String nextValue = peek().getValue();
                if ("to".equalsIgnoreCase(nextValue)) {
                    // Empty min value
                    minValue = "";
                } else {
                    throw new IllegalArgumentException("Expected min value or 'to' at position " + peek().getPosition());
                }
            } else {
                throw new IllegalArgumentException("Expected min value at position " + peek().getPosition());
            }
            
            // Consume "to" keyword
            FilterToken toToken = consume(FilterTokenType.FIELD, "Expected 'to'");
            if (!"to".equalsIgnoreCase(toToken.getValue())) {
                throw new IllegalArgumentException("Expected 'to' at position " + toToken.getPosition());
            }
            
            // Parse max value
            String maxValue = "";
            if (check(FilterTokenType.VALUE)) {
                FilterToken maxToken = advance();
                maxValue = maxToken.getValue();
            } else if (check(FilterTokenType.FIELD)) {
                // Empty max value (unbounded)
                advance();
                maxValue = "";
            } else {
                throw new IllegalArgumentException("Expected max value at position " + peek().getPosition());
            }
            
            return new RangeExpression<>(field, minValue, maxValue, predicateBuilder);
        }
        
        private FilterExpression<T> parseInExpression(String field) {
            // Consume "in" operator (already peeked)
            advance();
            
            // Consume left parenthesis
            consume(FilterTokenType.LEFT_PAREN, "Expected '(' after 'in'");
            
            // Parse values
            List<String> values = new ArrayList<>();
            
            while (!check(FilterTokenType.RIGHT_PAREN)) {
                String value;
                if (check(FilterTokenType.VALUE)) {
                    FilterToken valueToken = advance();
                    value = valueToken.getValue();
                } else if (check(FilterTokenType.FIELD)) {
                    FilterToken valueToken = advance();
                    value = valueToken.getValue();
                } else {
                    throw new IllegalArgumentException("Expected value or ')' at position " + peek().getPosition());
                }
                
                values.add(value);
                
                // Skip comma if present (optional)
                if (check(FilterTokenType.VALUE) || check(FilterTokenType.FIELD)) {
                    // More values, continue
                }
            }
            
            // Consume right parenthesis
            consume(FilterTokenType.RIGHT_PAREN, "Expected ')' after in values");
            
            if (values.isEmpty()) {
                throw new IllegalArgumentException("'in' operator requires at least one value");
            }
            
            return new InExpression<>(field, values, predicateBuilder);
        }
        
        private boolean match(FilterTokenType type) {
            if (check(type)) {
                advance();
                return true;
            }
            return false;
        }
        
        private boolean check(FilterTokenType type) {
            if (isAtEnd()) {
                return false;
            }
            return peek().getType() == type;
        }
        
        private FilterToken advance() {
            if (!isAtEnd()) {
                current++;
            }
            return previous();
        }
        
        private boolean isAtEnd() {
            return peek().getType() == FilterTokenType.EOF;
        }
        
        private FilterToken peek() {
            return tokens.get(current);
        }
        
        private FilterToken previous() {
            return tokens.get(current - 1);
        }
        
        private FilterToken consume(FilterTokenType type, String message) {
            if (check(type)) {
                return advance();
            }
            throw new IllegalArgumentException(message + " at position " + peek().getPosition());
        }
    }
    
}

