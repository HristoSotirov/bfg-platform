package com.bfg.platform.common.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.data.domain.Page;

@Getter
@AllArgsConstructor
public class ListResult<T, F> {
    private final Page<T> page;
    private final F facets;
}

