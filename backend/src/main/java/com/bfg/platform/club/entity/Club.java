package com.bfg.platform.club.entity;

import com.bfg.platform.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "clubs")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Club {

    @Id
    @Column(name = "id", updatable = false, insertable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "club_admin")
    private UUID clubAdmin;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_admin", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private User clubAdminUser;

    @Column(name = "name")
    private String name;

    @Column(name = "short_name")
    private String shortName;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "card_prefix")
    private String cardPrefix;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Column(name = "club_email")
    private String clubEmail;

    @Column(name = "created_at", insertable = false, updatable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;

    @OneToMany(mappedBy = "club", fetch = FetchType.LAZY, cascade = {})
    private List<ClubCoach> coaches;
}

