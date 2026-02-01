package com.bfg.platform.athlete.entity;

import com.bfg.platform.club.entity.Club;
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
@Table(name = "athlete_photo_history")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class AthletePhotoHistory {

    @Id
    @Column(name = "id", updatable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "athlete_id")
    private UUID athleteId;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "uploaded_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant uploadedAt;

    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Club uploadedByClub;
}

