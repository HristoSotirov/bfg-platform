package com.bfg.platform.common.query;

final class FilterToken {
    private final FilterTokenType type;
    private final String value;
    private final int position;

    FilterToken(FilterTokenType type, String value, int position) {
        this.type = type;
        this.value = value;
        this.position = position;
    }

    FilterTokenType getType() {
        return type;
    }

    String getValue() {
        return value;
    }

    int getPosition() {
        return position;
    }

    @Override
    public String toString() {
        return "FilterToken{" +
                "type=" + type +
                ", value='" + value + '\'' +
                ", position=" + position +
                '}';
    }
}

