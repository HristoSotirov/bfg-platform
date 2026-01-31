package com.bfg.platform.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueryParams {
    
    @Builder.Default
    private Map<String, String> filter = new HashMap<>();
    private String sort;
    @Builder.Default
    private String sortDirection = "asc";
    @Builder.Default
    private Integer top = 100;
    @Builder.Default
    private Integer skip = 0;
    @Builder.Default
    private Boolean count = false;
    @Builder.Default
    private List<String> expand = new ArrayList<>();

    public boolean isAscending() {
        return sortDirection == null || "asc".equalsIgnoreCase(sortDirection);
    }
}

