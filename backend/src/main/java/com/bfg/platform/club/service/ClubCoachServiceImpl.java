package com.bfg.platform.club.service;

import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.club.mapper.ClubCoachMapper;
import com.bfg.platform.club.mapper.ClubMapper;
import com.bfg.platform.club.query.ClubCoachQueryAdapter;
import com.bfg.platform.club.repository.ClubCoachRepository;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ForbiddenException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.FacetQueryService;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.security.SecurityContextHelper;
import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCoachDto;
import com.bfg.platform.gen.model.ClubCoachFacets;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.user.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class ClubCoachServiceImpl implements ClubCoachService {

    private final ClubCoachRepository clubCoachRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final SecurityContextHelper securityContextHelper;
    private final FacetQueryService facetQueryService;

    // GET methods (Read)
    @Override
    public ListResult<ClubCoachDto, ClubCoachFacets> getCoachesByClubId(UUID clubId, String filter, String orderBy, Integer top, Integer skip) {
        clubRepository.findById(clubId)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubId));

        Pageable pageable = OffsetBasedPageRequest.of(skip, top, ClubCoachQueryAdapter.parseSort(orderBy));
        Specification<ClubCoach> spec = Specification
                .where(ClubCoachQueryAdapter.parseFilter(filter))
                .and((root, query, cb) -> cb.equal(root.get("clubId"), clubId));
        var page = clubCoachRepository.findAll(spec, pageable)
                .map(ClubCoachMapper::toDto);

        ClubCoachFacets facets = new ClubCoachFacets()
                .clubId(facetQueryService.buildFacetOptions(
                        com.bfg.platform.club.entity.ClubCoach.class,
                        spec,
                        "clubId"
                ));
        return new ListResult<>(page, facets);
    }

    @Override
    public Optional<ClubDto> getClubByCoachId(UUID coachId) {
        return clubCoachRepository.findByCoachId(coachId)
                .map(ClubCoach::getClubId)
                .flatMap(clubRepository::findById)
                .map(ClubMapper::toDto);
    }

    // POST methods (Create)
    @Override
    @Transactional
    public Optional<ClubCoachDto> assignCoachToClub(ClubCoachCreateRequest request) {
        validateAssignPermissions(request);

        clubRepository.findById(request.getClubId())
                .orElseThrow(() -> new ResourceNotFoundException("Club", request.getClubId()));

        validateCoachRole(request.getCoachId());

        try {
            ClubCoach clubCoach = ClubCoachMapper.fromCreateRequest(request);

            ClubCoach saved = clubCoachRepository.save(clubCoach);
            return Optional.of(ClubCoachMapper.toDto(saved));
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractConflictReason(e));
        }
    }

    // DELETE methods
    @Override
    @Transactional
    public void removeCoachFromClub(UUID clubCoachId) {
        ClubCoach clubCoach = clubCoachRepository.findById(clubCoachId)
                .orElseThrow(() -> new ResourceNotFoundException("ClubCoach", clubCoachId));

        validateRemovePermissions(clubCoach);

        try {
            clubCoachRepository.delete(clubCoach);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Failed to remove coach from club");
        }
    }

    // Helper methods
    private void validateCoachRole(UUID coachId) {
        if (!userRepository.isCoach(coachId)) {
            throw new ValidationException("User is not assigned the COACH role оr does not exist");
        }
    }

    private String extractConflictReason(DataIntegrityViolationException e) {
        String message = e.getMessage();
        if (message == null) return "Failed to assign coach to club";
        
        String lowerMessage = message.toLowerCase();
        
        // Check exact foreign key constraint names from Liquibase
        if (lowerMessage.contains("fk_club_coaches_coach_id")) {
            return "User does not exist or cannot be assigned as coach";
        }
        if (lowerMessage.contains("fk_club_coaches_club_id")) {
            return "Club does not exist";
        }
        
        // Check unique constraint (coach_id is unique in club_coaches table)
        if (lowerMessage.contains("club_coaches_coach_id_key") || 
            (lowerMessage.contains("coach_id") && lowerMessage.contains("unique"))) {
            return "Coach is already assigned to this club";
        }
        
        // Generic fallback
        if (lowerMessage.contains("unique") || lowerMessage.contains("duplicate")) {
            return "Coach is already assigned to this club";
        }
        if (lowerMessage.contains("foreign key") || lowerMessage.contains("fk_")) {
            return "Failed to assign coach to club: referenced entity does not exist";
        }
        
        return "Failed to assign coach to club";
    }

    private void validateAssignPermissions(ClubCoachCreateRequest request) {
        com.bfg.platform.gen.model.SystemRole currentRole = securityContextHelper.getUserRole();
        if (currentRole == null) {
            throw new ForbiddenException("Current user role is not available");
        }

        switch (currentRole) {
            case APP_ADMIN, FEDERATION_ADMIN -> {
                // No additional checks needed
            }
            case CLUB_ADMIN -> {
                UUID currentUserId = securityContextHelper.getUserId();
                Club club = clubRepository.findByClubAdmin(currentUserId)
                        .orElseThrow(() -> new ForbiddenException("Club admin is not associated with any club"));
                if (!request.getClubId().equals(club.getId())) {
                    throw new ForbiddenException("Club admins can only assign coaches to their own club");
                }
            }
            default -> throw new ForbiddenException("You are not allowed to assign coaches");
        }
    }

    private void validateRemovePermissions(ClubCoach clubCoach) {
        SystemRole currentRole = securityContextHelper.getUserRole();
        if (currentRole == null) {
            throw new ForbiddenException("Current user role is not available");
        }

        switch (currentRole) {
            case APP_ADMIN, FEDERATION_ADMIN -> {
                // No additional checks needed
            }
            case CLUB_ADMIN -> {
                UUID currentUserId = securityContextHelper.getUserId();
                Club club = clubRepository.findByClubAdmin(currentUserId)
                        .orElseThrow(() -> new ForbiddenException("Club admin is not associated with any club"));
                if (!clubCoach.getClubId().equals(club.getId())) {
                    throw new ForbiddenException("Club admins can only remove coaches from their own club");
                }
            }
            default -> throw new ForbiddenException("You are not allowed to remove coaches");
        }
    }
}

