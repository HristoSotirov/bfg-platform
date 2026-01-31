package com.bfg.platform.common.security;

import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.club.repository.ClubCoachRepository;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.exception.ForbiddenException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.gen.model.SystemRole;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@AllArgsConstructor
public class AuthorizationServiceImpl implements AuthorizationService {
    private final SecurityContextHelper securityContextHelper;
    private final ClubRepository clubRepository;
    private final ClubCoachRepository clubCoachRepository;

    @Override
    public void requireCanModifyClub(UUID clubId) {
        SystemRole role = securityContextHelper.getUserRole();
        UUID currentUserId = securityContextHelper.getUserId();

        if (SystemRole.APP_ADMIN.equals(role) || SystemRole.FEDERATION_ADMIN.equals(role)) {
            return;
        }

        if (SystemRole.CLUB_ADMIN.equals(role)) {
            Club club = clubRepository.findById(clubId)
                    .orElseThrow(() -> new ResourceNotFoundException("Club", clubId));
            if (currentUserId != null && currentUserId.equals(club.getClubAdmin())) {
                return;
            }
        }

        throw new ForbiddenException("You do not have permission to modify this club");
    }

    @Override
    public void requireCanManageClubCoaches(UUID clubId) {
        // Same rule as club modification: app/federation admins or club admin of this club.
        requireCanModifyClub(clubId);
    }

    @Override
    public void requireCanManageAccreditations(UUID clubId) {
        requireCanOperateOnClub(clubId);
    }

    @Override
    public UUID requireCurrentUserClubId() {
        UUID userId = securityContextHelper.getUserId();
        SystemRole role = securityContextHelper.getUserRole();

        if (SystemRole.CLUB_ADMIN.equals(role)) {
            Club club = clubRepository.findByClubAdmin(userId)
                    .orElseThrow(() -> new ForbiddenException("Club admin is not associated with any club"));
            return club.getId();
        }

        if (SystemRole.COACH.equals(role)) {
            return clubCoachRepository.findByCoachId(userId)
                    .map(ClubCoach::getClubId)
                    .orElseThrow(() -> new ForbiddenException("Coach is not assigned to any club"));
        }

        throw new ForbiddenException("User role does not have associated club");
    }

    private void requireCanOperateOnClub(UUID clubId) {
        if (clubId == null) {
            throw new ValidationException("Club ID is required");
        }

        SystemRole role = securityContextHelper.getUserRole();
        UUID currentUserId = securityContextHelper.getUserId();

        if (SystemRole.APP_ADMIN.equals(role) || SystemRole.FEDERATION_ADMIN.equals(role)) {
            return;
        }

        if (SystemRole.CLUB_ADMIN.equals(role)) {
            Club club = clubRepository.findByClubAdmin(currentUserId)
                    .orElseThrow(() -> new ForbiddenException("Club admin is not associated with any club"));
            if (clubId.equals(club.getId())) {
                return;
            }
        }

        if (SystemRole.COACH.equals(role)) {
            if (clubCoachRepository.existsByClubIdAndCoachId(clubId, currentUserId)) {
                return;
            }
        }

        throw new ForbiddenException("You do not have permission to operate on this club");
    }
}

