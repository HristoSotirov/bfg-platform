package com.bfg.platform.common.query;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.io.Serial;
import java.io.Serializable;

/**
 * Pageable implementation that supports true offset/limit pagination.
 * Useful when using skip/top style params where skip is not necessarily a multiple of top.
 */
public final class OffsetBasedPageRequest implements Pageable, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private final long offset;
    private final int limit;
    private final Sort sort;

    public OffsetBasedPageRequest(long offset, int limit, Sort sort) {
        if (offset < 0) {
            throw new IllegalArgumentException("skip (offset) must be >= 0");
        }
        if (limit <= 0) {
            throw new IllegalArgumentException("top (limit) must be > 0");
        }
        this.offset = offset;
        this.limit = limit;
        this.sort = sort == null ? Sort.unsorted() : sort;
    }

    public static OffsetBasedPageRequest of(Integer skip, Integer top, Sort sort) {
        long off = skip == null ? 0L : skip.longValue();
        int lim = top == null ? 100 : top;
        return new OffsetBasedPageRequest(off, lim, sort);
    }

    @Override
    public int getPageNumber() {
        return (int) (offset / limit);
    }

    @Override
    public int getPageSize() {
        return limit;
    }

    @Override
    public long getOffset() {
        return offset;
    }

    @Override
    public Sort getSort() {
        return sort;
    }

    @Override
    public Pageable next() {
        return new OffsetBasedPageRequest(offset + limit, limit, sort);
    }

    @Override
    public Pageable previousOrFirst() {
        return hasPrevious() ? new OffsetBasedPageRequest(Math.max(0, offset - limit), limit, sort) : first();
    }

    @Override
    public Pageable first() {
        return new OffsetBasedPageRequest(0, limit, sort);
    }

    @Override
    public Pageable withPage(int pageNumber) {
        if (pageNumber < 0) {
            throw new IllegalArgumentException("pageNumber must be >= 0");
        }
        return new OffsetBasedPageRequest((long) pageNumber * limit, limit, sort);
    }

    @Override
    public boolean hasPrevious() {
        return offset > 0;
    }
}

