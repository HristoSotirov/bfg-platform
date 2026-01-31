package com.bfg.platform.club.entity;

import com.bfg.platform.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "club_coaches")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ClubCoach {

    @Id
    @Column(name = "id", updatable = false, insertable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "coach_id")
    private UUID coachId;

    @Column(name = "club_id")
    private UUID clubId;

    @Column(name = "assignment_date", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant assignmentDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coach_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private User coach;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Club club;

}

