package com.bfg.platform.athlete.service;

import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.athlete.mapper.AthleteMapper;
import com.bfg.platform.athlete.query.AthleteQueryAdapter;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.club.repository.ClubCoachRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.AthleteBatchMedicalUpdateRequest;
import com.bfg.platform.gen.model.AthleteDto;
import com.bfg.platform.gen.model.AthleteUpdateRequest;
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
    private final ClubCoachRepository clubCoachRepository;

    @Override
    public Page<AthleteDto> getAllAthletes(
            String filter,
            String search,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    ) {
        Specification<Athlete> filterSpec = AthleteQueryAdapter.parseFilter(filter);
        Specification<Athlete> searchSpec = AthleteQueryAdapter.parseSearch(search);
        Specification<Athlete> spec = Specification.where(filterSpec).and(searchSpec);
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, AthleteQueryAdapter.parseSort(orderBy));

        Page<Athlete> athletePage = athleteRepository.findAll(spec, pageable);
        return athletePage.map(AthleteMapper::toDto);
    }

    @Override
    public Optional<AthleteDto> getAthleteDtoByUuid(UUID uuid, List<String> expand) {
        return athleteRepository.findById(uuid)
                .map(AthleteMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<AthleteDto> updateAthlete(UUID uuid, AthleteUpdateRequest request) {
        try {
            return athleteRepository.findById(uuid)
                    .map(a -> {
                        AthleteMapper.updateAthleteFromRequest(a, request);
                        Athlete saved = saveAthlete(a);
                        return AthleteMapper.toDto(saved);
                    });
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractConflictReason(e));
        }
    }

    @Override
    @Transactional
    public List<AthleteDto> batchUpdateMedicalInfo(AthleteBatchMedicalUpdateRequest request) {
        List<AthleteDto> updated = new ArrayList<>();
        
        LocalDate medicalExaminationDue = request.getMedicalExaminationStartDate()
                .plusMonths(request.getMedicalExaminationDurationMonths());
        
        for (UUID athleteId : request.getAthleteIds()) {
            Optional<Athlete> athleteOpt = athleteRepository.findById(athleteId);
            if (athleteOpt.isPresent()) {
                Athlete athlete = athleteOpt.get();
                athlete.setInsuranceFrom(request.getInsuranceFrom());
                athlete.setInsuranceTo(request.getInsuranceTo());
                athlete.setMedicalExaminationDue(medicalExaminationDue);
                
                Athlete saved = saveAthlete(athlete);
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
            String conflictReason = extractConflictReason(e);
            throw new ConflictException(conflictReason);
        }
    }

    private Athlete saveAthlete(Athlete athlete) {
        try {
            return athleteRepository.save(athlete);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractConflictReason(e));
        }
    }

    private String extractConflictReason(DataIntegrityViolationException e) {
        String message = e.getMessage();
        if (message == null) return "Operation failed";
        
        String lowerMessage = message.toLowerCase();
        
        if (lowerMessage.contains("uk_athletes_full_name_dob")) {
            return "Athlete with these details already exists";
        }
        if (lowerMessage.contains("uq_accreditations_athlete_club_year")) {
            return "Accreditation for this athlete, club, and year already exists";
        }
        if (lowerMessage.contains("fk_accreditations_athlete_id")) {
            return lowerMessage.contains("delete") || lowerMessage.contains("update") ? 
                "Cannot delete athlete: athlete has accreditations" :
                "Cannot create accreditation: athlete does not exist";
        }
        if (lowerMessage.contains("fk_accreditations_club_id")) {
            return "Cannot create accreditation: club does not exist";
        }
        
        if (lowerMessage.contains("unique") || lowerMessage.contains("duplicate")) {
            return "A record with these details already exists";
        }
        if (lowerMessage.contains("foreign key") || lowerMessage.contains("fk_")) {
            return "Cannot perform operation: record is referenced by other records";
        }
        
        return "Operation failed";
    }
}

