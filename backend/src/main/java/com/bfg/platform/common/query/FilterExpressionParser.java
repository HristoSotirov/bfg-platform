package com.bfg.platform.common.query;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public final class FilterExpressionParser {
    private FilterExpressionParser() {
        throw new IllegalStateException("Utility class");
    }

    @FunctionalInterface
    public interface PredicateBuilder<T> {
        Predicate build(Root<T> root, CriteriaBuilder cb, String field, String operator, String valueRaw);
    }

    public static <T> Specification<T> parse(String filter, PredicateBuilder<T> predicateBuilder) {
        if (filter == null || filter.isBlank()) {
            return Specification.where(null);
        }
        FilterTokenizer tokenizer = new FilterTokenizer(filter);
        List<FilterToken> tokens = tokenizer.tokenize();
        ExpressionParser<T> parser = new ExpressionParser<>(tokens, predicateBuilder);
        FilterExpression<T> expression = parser.parse();
        return expression.toSpecification();
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
        private final PredicateBuilder<T> predicateBuilder;

        ComparisonExpression(String field, String operator, String value, PredicateBuilder<T> predicateBuilder) {
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

    private static final class ExpressionParser<T> {
        private final List<FilterToken> tokens;
        private final PredicateBuilder<T> predicateBuilder;
        private int current;

        ExpressionParser(List<FilterToken> tokens, PredicateBuilder<T> predicateBuilder) {
            this.tokens = tokens;
            this.predicateBuilder = predicateBuilder;
            this.current = 0;
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

            FilterToken opToken = consume(FilterTokenType.COMPARISON_OP, "Expected comparison operator");
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

