package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.Competition;

import java.time.Instant;

/**
 * Computed phase of the entry lifecycle for a competition.
 * Derived from competition date fields + current time — never stored in the DB.
 */
public enum EntryPhase {

    /** Before entrySubmissionsOpenAt — no entries allowed */
    NOT_OPEN,

    /** Between entrySubmissionsOpenAt and entrySubmissionsClosedAt — full CRUD for all roles */
    SUBMISSION,

    /** Between entrySubmissionsClosedAt and lastChangesBeforeTmAt — club roles restricted, admin full access */
    LIMITED_EDIT,

    /** Between lastChangesBeforeTmAt and technicalMeetingAt — only admin roles can edit */
    ADMIN_EDIT,

    /** After technicalMeetingAt — only admin roles, with progression warning */
    RACE;

    /**
     * Resolves the current entry phase for a competition based on its date fields and the current time.
     */
    public static EntryPhase resolvePhase(Competition competition) {
        return resolvePhase(competition, Instant.now());
    }

    /**
     * Resolves the entry phase for a competition at a given point in time.
     * Visible for testing.
     */
    static EntryPhase resolvePhase(Competition competition, Instant now) {
        Instant open = competition.getEntrySubmissionsOpenAt();
        Instant closed = competition.getEntrySubmissionsClosedAt();
        Instant lastChanges = competition.getLastChangesBeforeTmAt();
        Instant tm = competition.getTechnicalMeetingAt();

        if (open == null || now.isBefore(open)) {
            return NOT_OPEN;
        }
        if (closed == null || !now.isAfter(closed)) {
            return SUBMISSION;
        }
        if (lastChanges == null || !now.isAfter(lastChanges)) {
            return LIMITED_EDIT;
        }
        if (tm == null || !now.isAfter(tm)) {
            return ADMIN_EDIT;
        }
        return RACE;
    }
}
