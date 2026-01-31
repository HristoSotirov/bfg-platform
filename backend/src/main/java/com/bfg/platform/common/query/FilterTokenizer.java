package com.bfg.platform.common.query;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Tokenizes filter expressions into tokens.
 */
final class FilterTokenizer {
    private final String input;
    private int position;
    private final List<FilterToken> tokens;

    FilterTokenizer(String input) {
        this.input = input != null ? input.trim() : "";
        this.position = 0;
        this.tokens = new ArrayList<>();
    }

    List<FilterToken> tokenize() {
        while (position < input.length()) {
            skipWhitespace();
            if (position >= input.length()) {
                break;
            }

            char c = input.charAt(position);

            if (c == '(') {
                tokens.add(new FilterToken(FilterTokenType.LEFT_PAREN, "(", position));
                position++;
            } else if (c == ')') {
                tokens.add(new FilterToken(FilterTokenType.RIGHT_PAREN, ")", position));
                position++;
            } else if (c == '\'') {
                tokens.add(tokenizeQuotedString());
            } else if (Character.isLetter(c) || c == '_') {
                tokens.add(tokenizeIdentifierOrKeyword());
            } else if (Character.isDigit(c) || c == '-' || c == '+' || c == '.') {
                tokens.add(tokenizeUnquotedValue());
            } else {
                throw new IllegalArgumentException("Unexpected character '" + c + "' at position " + position);
            }
        }

        tokens.add(new FilterToken(FilterTokenType.EOF, null, position));
        return tokens;
    }

    private void skipWhitespace() {
        while (position < input.length() && Character.isWhitespace(input.charAt(position))) {
            position++;
        }
    }

    private FilterToken tokenizeQuotedString() {
        int startPos = position;
        position++;

        StringBuilder value = new StringBuilder();
        boolean escaped = false;

        while (position < input.length()) {
            char c = input.charAt(position);
            if (escaped) {
                if (c == '\'') {
                    value.append('\'');
                } else {
                    value.append('\\').append(c);
                }
                escaped = false;
                position++;
            } else if (c == '\\') {
                escaped = true;
                position++;
            } else if (c == '\'') {
                position++;
                return new FilterToken(FilterTokenType.VALUE, value.toString(), startPos);
            } else {
                value.append(c);
                position++;
            }
        }

        throw new IllegalArgumentException("Unclosed quoted string starting at position " + startPos);
    }

    private FilterToken tokenizeIdentifierOrKeyword() {
        int startPos = position;
        StringBuilder value = new StringBuilder();

        while (position < input.length()) {
            char c = input.charAt(position);
            if (Character.isLetterOrDigit(c) || c == '_') {
                value.append(c);
                position++;
            } else {
                break;
            }
        }

        String identifier = value.toString();
        String lowerIdentifier = identifier.toLowerCase(Locale.ROOT);

        if ("and".equals(lowerIdentifier)) {
            return new FilterToken(FilterTokenType.AND, "and", startPos);
        } else if ("or".equals(lowerIdentifier)) {
            return new FilterToken(FilterTokenType.OR, "or", startPos);
        } else if (isComparisonOperator(lowerIdentifier)) {
            return new FilterToken(FilterTokenType.COMPARISON_OP, lowerIdentifier, startPos);
        } else {
            return new FilterToken(FilterTokenType.FIELD, identifier, startPos);
        }
    }

    private FilterToken tokenizeUnquotedValue() {
        int startPos = position;
        StringBuilder value = new StringBuilder();

        while (position < input.length()) {
            char c = input.charAt(position);
            if (Character.isLetterOrDigit(c) || c == '-' || c == '.' || c == ':' || c == 'T' || c == 'Z' || c == '+' || c == '_') {
                value.append(c);
                position++;
            } else if (Character.isWhitespace(c) || c == ')' || c == '(') {
                break;
            } else {
                break;
            }
        }

        String valueStr = value.toString();
        if (valueStr.isEmpty()) {
            throw new IllegalArgumentException("Empty value at position " + startPos);
        }

        return new FilterToken(FilterTokenType.VALUE, valueStr, startPos);
    }

    private boolean isComparisonOperator(String str) {
        return "eq".equals(str) || "ne".equals(str) || "gt".equals(str) ||
               "ge".equals(str) || "lt".equals(str) || "le".equals(str) || "in".equals(str);
    }
}

