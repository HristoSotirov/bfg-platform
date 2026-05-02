package com.bfg.platform.athlete.service;

import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.athlete.mapper.AthleteMapper;
import com.bfg.platform.athlete.query.AthleteQueryAdapter;
import com.bfg.platform.athlete.repository.AccreditationRepository;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ForbiddenException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.security.AuthorizationService;
import com.bfg.platform.common.security.ScopeAccessPolicy;
import com.bfg.platform.common.security.ScopeAccessValidator;
import com.bfg.platform.common.security.SecurityContextHelper;
import com.bfg.platform.gen.model.AthleteBatchMedicalUpdateRequest;
import com.bfg.platform.gen.model.AthleteDto;
import com.bfg.platform.gen.model.AthleteUpdateRequest;
import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.SystemRole;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class AthleteServiceImpl implements AthleteService {

    private final AthleteRepository athleteRepository;
    private final AccreditationRepository accreditationRepository;
    private final SecurityContextHelper securityContextHelper;
    private final AuthorizationService authorizationService;
    private final ScopeAccessValidator scopeAccessValidator;
    private final ScopeAccessPolicy scopeAccessPolicy;

    @Override
    public Page<AthleteDto> getAllAthletes(
            String filter,
            String search,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    ) {
        // Validate scope filter - throws 403 if invalid
        scopeAccessValidator.validateFilterScope(filter);
        ExpandQueryParser.parse(expand, Athlete.class);

        // Athletes don't have direct clubId - they are accessed via accreditations
        // Club restriction is enforced at the accreditations endpoint

        // No implicit filter override - use only user-provided filter
        Specification<Athlete> filterSpec = AthleteQueryAdapter.parseFilter(filter);
        Specification<Athlete> searchSpec = AthleteQueryAdapter.parseSearch(search);
        Specification<Athlete> spec = Specification.where(filterSpec).and(searchSpec);
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, AthleteQueryAdapter.parseSort(orderBy));

        Page<Athlete> athletePage = athleteRepository.findAll(spec, pageable);
        return athletePage.map(AthleteMapper::toDto);
    }

    @Override
    public Optional<AthleteDto> getAthleteDtoByUuid(UUID uuid, List<String> expand) {
        ExpandQueryParser.parse(expand, Athlete.class);
        return athleteRepository.findById(uuid)
                .map(athlete -> {
                    validateAthleteAccess(athlete);
                    return AthleteMapper.toDto(athlete);
                });
    }

    @Override
    @Transactional
    public Optional<AthleteDto> updateAthlete(UUID uuid, AthleteUpdateRequest request) {
        return athleteRepository.findById(uuid)
                .map(a -> {
                    validateAthleteAccess(a);
                    AthleteMapper.updateAthleteFromRequest(a, request);
                    Athlete saved = athleteRepository.save(a);
                    return AthleteMapper.toDto(saved);
                });
    }

    /**
     * Validates that the current user has access to the athlete.
     * Athletes are special - they don't have a direct clubId, so we check via accreditations.
     */
    private void validateAthleteAccess(Athlete athlete) {
        ScopeType userScope = securityContextHelper.getScopeType();
        var userRole = securityContextHelper.getUserRole();
        
        // First check scope access
        if (!scopeAccessPolicy.getAllowedScopes(userRole, userScope).contains(athlete.getScopeType())) {
            throw new ForbiddenException("You do not have access to this athlete");
        }
        
        // For EXTERNAL/NATIONAL CLUB_ADMIN/COACH, check access via accreditations
        // (Athletes don't have direct clubId - they are linked via accreditations)
        if (requiresAthleteClubRestriction(userRole, userScope)) {
            UUID myClubId = authorizationService.requireCurrentUserClubId();
            if (accreditationRepository.findFirstByAthleteIdAndClubIdOrderByYearDescCreatedAtDesc(athlete.getId(), myClubId).isEmpty()) {
                throw new ForbiddenException("You do not have access to this athlete");
            }
        }
    }
    
    /**
     * Determines if the user needs club-based access restriction for individual athlete access.
     */
    private boolean requiresAthleteClubRestriction(SystemRole role, ScopeType scope) {
        if (role == SystemRole.APP_ADMIN ||
            role == SystemRole.FEDERATION_ADMIN) {
            return false;
        }
        return scope != ScopeType.INTERNAL;
    }

    @Override
    @Transactional
    public List<AthleteDto> batchUpdateMedicalInfo(AthleteBatchMedicalUpdateRequest request) {
        LocalDate insuranceFrom = request.getInsuranceFrom();
        LocalDate insuranceTo = request.getInsuranceTo();
        LocalDate medicalExaminationStartDate = request.getMedicalExaminationStartDate();
        Integer medicalExaminationDurationMonths = request.getMedicalExaminationDurationMonths();
        
        boolean hasInsurance = insuranceFrom != null && insuranceTo != null;
        boolean hasMedical = medicalExaminationStartDate != null && medicalExaminationDurationMonths != null;
        
        if (!hasInsurance && !hasMedical) {
            throw new IllegalArgumentException(
                "At least one pair must be provided: either insurance (insuranceFrom and insuranceTo) " +
                "or medical examination (medicalExaminationStartDate and medicalExaminationDurationMonths)"
            );
        }
        
        if (insuranceFrom != null && insuranceTo == null) {
            throw new IllegalArgumentException("insuranceTo is required when insuranceFrom is provided");
        }
        if (insuranceTo != null && insuranceFrom == null) {
            throw new IllegalArgumentException("insuranceFrom is required when insuranceTo is provided");
        }
        if (medicalExaminationStartDate != null && medicalExaminationDurationMonths == null) {
            throw new IllegalArgumentException("medicalExaminationDurationMonths is required when medicalExaminationStartDate is provided");
        }
        if (medicalExaminationDurationMonths != null && medicalExaminationStartDate == null) {
            throw new IllegalArgumentException("medicalExaminationStartDate is required when medicalExaminationDurationMonths is provided");
        }
        
        List<AthleteDto> updated = new ArrayList<>();
        
        LocalDate medicalExaminationDue = null;
        if (hasMedical) {
            medicalExaminationDue = medicalExaminationStartDate.plusMonths(medicalExaminationDurationMonths);
        }
        
        for (UUID athleteId : request.getAthleteIds()) {
            Optional<Athlete> athleteOpt = athleteRepository.findById(athleteId);
            if (athleteOpt.isPresent()) {
                Athlete athlete = athleteOpt.get();
                
                if (hasInsurance) {
                    athlete.setInsuranceFrom(insuranceFrom);
                    athlete.setInsuranceTo(insuranceTo);
                }
                
                if (hasMedical) {
                    athlete.setMedicalExaminationDue(medicalExaminationDue);
                }
                
                Athlete saved = athleteRepository.save(athlete);
                updated.add(AthleteMapper.toDto(saved));
            }
        }
        
        return updated;
    }

    @Override
    @Transactional
    public void deleteAthlete(UUID uuid) {
        Athlete athlete = athleteRepository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Athlete", uuid));

        try {
            athleteRepository.delete(athlete);
        } catch (DataIntegrityViolationException e) {
            String message = ConstraintViolationMessageExtractor.extractMessage(e);
            String lowerMessage = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (lowerMessage.contains("fk_accreditations_athlete_id")) {
                message = "Cannot delete athlete: athlete has accreditations";
            }
            throw new ConflictException(message);
        }
    }
}

