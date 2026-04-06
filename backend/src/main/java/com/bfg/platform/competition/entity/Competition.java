package com.bfg.platform.competition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "competitions")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Competition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "short_name", nullable = false)
    private String shortName;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "location")
    private String location;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "entry_submissions_open_at")
    private Instant entrySubmissionsOpenAt;

    @Column(name = "entry_submissions_closed_at")
    private Instant entrySubmissionsClosedAt;

    @Column(name = "last_changes_before_tm_at")
    private Instant lastChangesBeforeTmAt;

    @Column(name = "technical_meeting_at")
    private Instant technicalMeetingAt;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "scoring_scheme_id", nullable = false)
    private UUID scoringSchemeId;

    @Column(name = "qualification_scheme_id", nullable = false)
    private UUID qualificationSchemeId;

    @Column(name = "competition_type", nullable = false)
    private String competitionType;

    @Column(name = "is_template", nullable = false)
    private boolean isTemplate;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;
}
