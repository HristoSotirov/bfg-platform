package com.bfg.platform.competition.service;

import com.bfg.platform.gen.model.ClubEntriesDto;
import com.bfg.platform.gen.model.ClubEntriesRequest;

import java.util.List;
import java.util.UUID;

public interface EntryService {

    /**
     * Submit or replace all entries for a club in a competition.
     * Resolves the club from the current user's role if clubId is null.
     * Admins can pass clubId to submit on behalf of any club.
     * Club roles can only submit for their own club.
     */
    ClubEntriesDto submitEntries(UUID competitionId, UUID clubId, ClubEntriesRequest request);

    /**
     * Get entries for a competition.
     * Resolves visibility from the current user's role.
     * Admins see all entries (or filter by clubId). Club roles see only their own.
     */
    ClubEntriesDto getEntries(UUID competitionId, UUID clubId, List<String> expand);
}
