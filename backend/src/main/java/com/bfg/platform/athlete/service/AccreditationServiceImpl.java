package com.bfg.platform.athlete.service;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.mapper.AccreditationMapper;
import com.bfg.platform.athlete.repository.AccreditationRepository;
import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.athlete.mapper.AthleteMapper;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.security.AuthorizationService;
import com.bfg.platform.athlete.query.AccreditationQueryAdapter;
import com.bfg.platform.common.query.DateRange;
import com.bfg.platform.common.query.FacetQueryService;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.AccreditationDto;
import com.bfg.platform.gen.model.AccreditationFacets;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.AthleteBatchMigrationRequest;
import com.bfg.platform.gen.model.AthleteBatchMigrationRequestItem;
import com.bfg.platform.gen.model.AthleteBatchMigrationResponse;
import com.bfg.platform.gen.model.AthleteBatchMigrationResponseSkippedInner;
import com.bfg.platform.gen.model.AthleteCreateRequest;
import com.bfg.platform.gen.model.AthleteDto;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class AccreditationServiceImpl implements AccreditationService {

    private final AccreditationRepository accreditationRepository;
    private final AthleteRepository athleteRepository;
    private final ClubRepository clubRepository;
    private final AuthorizationService authorizationService;
    private final FacetQueryService facetQueryService;
    private final PlatformTransactionManager transactionManager;

    // GET methods (Read)
    @Override
    public ListResult<AccreditationDto, AccreditationFacets> getAllAccreditations(
            String filter,
            String search,
            String orderBy,
            Integer top,
            Integer skip
    ) {
        Specification<Accreditation> filterSpec = AccreditationQueryAdapter.parseFilter(filter);
        Specification<Accreditation> searchSpec = AccreditationQueryAdapter.parseSearch(search);
        Specification<Accreditation> spec = Specification.where(filterSpec).and(searchSpec);
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, AccreditationQueryAdapter.parseSort(orderBy));
        Page<Accreditation> page = accreditationRepository.findAll(spec, pageable);

        AccreditationFacets facets = buildFacets(spec);
        return new ListResult<>(page.map(AccreditationMapper::toDto), facets);
    }

    @Override
    public Optional<AccreditationDto> getAccreditationByUuid(UUID uuid) {
        validateUuid(uuid);
        return accreditationRepository.findWithRelationsById(uuid)
                .map(AccreditationMapper::toDto);
    }

    // POST methods (Create)
    @Override
    @Transactional
    public Optional<AccreditationDto> renewAccreditation(UUID athleteId) {
        try {
            // Get club ID from context (current user's club)
            UUID clubId = authorizationService.requireCurrentUserClubId();
            authorizationService.requireCanManageAccreditations(clubId);

            // Validate athlete exists
            athleteRepository.findById(athleteId)
                    .orElseThrow(() -> new ValidationException("Athlete not found"));

            // Validate club exists
            Club club = clubRepository.findById(clubId)
                    .orElseThrow(() -> new ValidationException("Club not found"));

            // Check if accreditation already exists for this year
            int currentYear = Year.now().getValue();
            boolean exists = accreditationRepository.existsByAthleteIdAndClubIdAndYear(athleteId, clubId, currentYear);
            
            if (exists) {
                throw new ConflictException("Accreditation for this athlete and year already exists");
            }

            // Get existing card number if available, otherwise generate new one
            String cardNumber;
            Optional<String> existingCardNumber = accreditationRepository
                    .findExistingCardNumberForAthleteAndClub(athleteId, clubId);

            if (existingCardNumber.isPresent()) {
                cardNumber = existingCardNumber.get();
            } else {
                cardNumber = generateNextCardNumber(club.getCardPrefix(), clubId);
            }

            // Create new accreditation for current year with PENDING_VALIDATION status
            Accreditation accreditation = AccreditationMapper.createNewAccreditation(
                    athleteId,
                    clubId,
                    cardNumber,
                    currentYear,
                    AccreditationStatus.PENDING_VALIDATION
            );

            Accreditation saved = accreditationRepository.save(accreditation);
            // Reload to get relations
            return accreditationRepository.findWithRelationsById(saved.getId())
                    .map(AccreditationMapper::toDto);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractConflictReason(e));
        }
    }

    @Override
    @Transactional
    public Optional<AthleteDto> createAthleteWithAccreditation(AthleteCreateRequest request) {
        UUID clubId = authorizationService.requireCurrentUserClubId();
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubId));

        Optional<Athlete> existingAthlete = athleteRepository.findByFirstNameAndMiddleNameAndLastNameAndDateOfBirth(
                request.getFirstName(),
                request.getMiddleName(),
                request.getLastName(),
                request.getDateOfBirth()
        );

        Athlete athlete;
        String cardNumber;

        if (existingAthlete.isPresent()) {
            athlete = existingAthlete.get();
            Optional<String> existingCardNumber = accreditationRepository
                    .findExistingCardNumberForAthleteAndClub(athlete.getId(), clubId);

            cardNumber = existingCardNumber.orElseGet(() -> generateNextCardNumber(club.getCardPrefix(), clubId));
        } else {
            athlete = saveAthlete(AthleteMapper.fromCreateRequest(request));
            cardNumber = generateNextCardNumber(club.getCardPrefix(), clubId);
        }

        Accreditation accreditation = AccreditationMapper.createNewAccreditation(
                athlete.getId(),
                clubId,
                cardNumber,
                Year.now().getValue(),
                AccreditationStatus.PENDING_VALIDATION
        );

        saveAccreditation(accreditation);

        return Optional.of(AthleteMapper.toDto(athlete));
    }

    @Override
    public AthleteBatchMigrationResponse batchMigrateAthletes(AthleteBatchMigrationRequest request) {
        List<AthleteDto> migrated = new ArrayList<>();
        List<AthleteBatchMigrationResponseSkippedInner> skipped = new ArrayList<>();
        int currentYear = Year.now().getValue();
        
        if (request.getAthletes().isEmpty()) {
            AthleteBatchMigrationResponse response = new AthleteBatchMigrationResponse();
            response.setMigrated(migrated);
            response.setSkipped(skipped);
            return response;
        }
        
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        
        for (AthleteBatchMigrationRequestItem item : request.getAthletes()) {
            transactionTemplate.execute(status -> {
                try {
                    AthleteDto athleteDto = migrateSingleAthlete(item, request.getYear(), currentYear);
                    migrated.add(athleteDto);
                } catch (ValidationException | ConflictException e) {
                    addSkipped(skipped, item, e.getMessage());
                    status.setRollbackOnly();
                }  catch (Exception e) {
                    addSkipped(skipped, item, "Error: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
                    status.setRollbackOnly();
                }
                return null;
            });
        }
        
        AthleteBatchMigrationResponse response = new AthleteBatchMigrationResponse();
        response.setMigrated(migrated);
        response.setSkipped(skipped);
        return response;
    }

    // PATCH methods (Update)
    @Override
    @Transactional
    public Optional<AccreditationDto> updateAccreditation(UUID uuid, AccreditationStatus status) {
        validateUuid(uuid);
        
        if (status == null) {
            throw new ValidationException("Status is required for accreditation update");
        }
        
        try {
            return accreditationRepository.findById(uuid)
                    .map(accreditation -> {
                        // Only status can be updated - update it directly
                        accreditation.setStatus(status);
                        
                        Accreditation saved = accreditationRepository.save(accreditation);
                        // Reload to get relations
                        return accreditationRepository.findWithRelationsById(saved.getId())
                                .map(AccreditationMapper::toDto)
                                .orElse(AccreditationMapper.toDto(saved));
                    });
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractConflictReason(e));
        }
    }

    // Helper methods
    private AccreditationFacets buildFacets(Specification<Accreditation> spec) {
        DateRange dobRange = facetQueryService.buildDateRange(
                Accreditation.class,
                spec,
                "athlete.dateOfBirth"
        );
        return new AccreditationFacets()
                .athleteId(facetQueryService.buildFacetOptions(Accreditation.class, spec, "athleteId"))
                .clubId(facetQueryService.buildFacetOptions(Accreditation.class, spec, "clubId"))
                .accreditationYear(facetQueryService.buildFacetOptions(Accreditation.class, spec, "year"))
                .accreditationStatus(facetQueryService.buildFacetOptions(Accreditation.class, spec, "status"))
                .dateOfBirthMin(dobRange.min())
                .dateOfBirthMax(dobRange.max());
    }

    private void validateUuid(UUID uuid) {
        if (uuid == null) {
            throw new ValidationException("Accreditation UUID cannot be null");
        }
    }

    private String extractConflictReason(DataIntegrityViolationException e) {
        String message = e.getMessage();
        if (message == null) return "Accreditation with these details already exists";
        
        String lowerMessage = message.toLowerCase();
        
        // Check exact constraint names from Liquibase
        if (lowerMessage.contains("uq_accreditations_athlete_club_year")) {
            return "Accreditation for this athlete, club, and year already exists";
        }
        if (lowerMessage.contains("fk_accreditations_athlete_id")) {
            return "Cannot create accreditation: athlete does not exist";
        }
        if (lowerMessage.contains("fk_accreditations_club_id")) {
            return "Cannot create accreditation: club does not exist";
        }
        
        // Generic fallback
        if (lowerMessage.contains("unique") || lowerMessage.contains("duplicate")) {
            return "Accreditation with these details already exists";
        }
        if (lowerMessage.contains("foreign key") || lowerMessage.contains("fk_")) {
            return "Cannot create accreditation: referenced entity does not exist";
        }
        
        return "Accreditation with these details already exists";
    }

    private AthleteDto migrateSingleAthlete(AthleteBatchMigrationRequestItem item, Integer year, int currentYear) {
        String newCardNumber = parseAndConvertCardNumber(item.getOldCardNumber());
        Club club = clubRepository.findByCardPrefix(newCardNumber.substring(0, 2))
                .orElseThrow(() -> new ValidationException(
                "No club found with card prefix: " + newCardNumber.substring(0, 2)
        ));

        // Find or create athlete
        Optional<Athlete> existingAthlete = athleteRepository.findByFirstNameAndMiddleNameAndLastNameAndDateOfBirth(
                item.getFirstName(),
                item.getMiddleName(),
                item.getLastName(),
                item.getDateOfBirth()
        );

        Athlete athlete;

        athlete = existingAthlete.orElseGet(() -> saveAthlete(AthleteMapper.fromMigrationItem(item)));

        boolean exists = accreditationRepository.existsByAthleteIdAndClubIdAndYear(athlete.getId(), club.getId(), year);
        
        if (exists) {
            throw new ValidationException("Accreditation already exists for athlete ");
        }

        AccreditationStatus status;
        if (year == currentYear) {
            status = AccreditationStatus.ACTIVE;
        } else if (year < currentYear) {
            status = AccreditationStatus.EXPIRED;
        } else {
            throw new ValidationException("Accreditation year cannot be in the future");
        }

        Accreditation accreditation = AccreditationMapper.createNewAccreditation(
                athlete.getId(),
                club.getId(),
                newCardNumber,
                year,
                status
        );
        
        saveAccreditation(accreditation);
        return AthleteMapper.toDto(athlete);
    }

    private String parseAndConvertCardNumber(String oldCardNumber) {
        // If 6 digits, use directly without transformation
        if (oldCardNumber.length() == 6) {
            return oldCardNumber;
        }
        
        String clubPrefix;
        String athleteSuffix;
        
        if (oldCardNumber.length() == 4) {
            // 4 digits: first digit = club prefix, last 3 = athlete number
            clubPrefix = normalizeClubPrefix(oldCardNumber.substring(0, 1));
            athleteSuffix = oldCardNumber.substring(1);
        } else if (oldCardNumber.length() == 5) {
            // 5 digits: first 2 digits = club prefix, last 3 = athlete number
            clubPrefix = normalizeClubPrefix(oldCardNumber.substring(0, 2));
            athleteSuffix = oldCardNumber.substring(2);
        } else {
            throw new ValidationException("Invalid card number format: " + oldCardNumber);
        }

        String athleteNumber = String.format("%04d", Integer.parseInt(athleteSuffix));
        
        return clubPrefix + athleteNumber;
    }

    private String normalizeClubPrefix(String prefix) {
        int prefixNum = Integer.parseInt(prefix);
        return String.format("%02d", prefixNum);
    }

    private String generateNextCardNumber(String clubPrefix, UUID clubId) {
        String prefixPattern = clubPrefix + "%";
        String athleteNumber = accreditationRepository.findNextAthleteNumberForClub(clubId, prefixPattern);

        int nextNumber = Integer.parseInt(athleteNumber);
        if (nextNumber > 9999) {
            throw new ValidationException(
                String.format("Maximum number of athletes (9999) reached for club with prefix %s. Cannot generate new card number.", clubPrefix)
            );
        }

        return clubPrefix + athleteNumber;
    }

    private void saveAccreditation(Accreditation accreditation) {
        try {
            accreditationRepository.save(accreditation);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractConflictReason(e));
        }
    }

    private Athlete saveAthlete(Athlete athlete) {
        try {
            return athleteRepository.save(athlete);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractConflictReasonForAthlete(e));
        }
    }

    private String extractConflictReasonForAthlete(DataIntegrityViolationException e) {
        String message = e.getMessage();
        if (message == null) return "Operation failed";
        
        String lowerMessage = message.toLowerCase();
        
        // Check exact constraint names from Liquibase
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
        
        // Generic fallback checks
        if (lowerMessage.contains("unique") || lowerMessage.contains("duplicate")) {
            return "A record with these details already exists";
        }
        if (lowerMessage.contains("foreign key") || lowerMessage.contains("fk_")) {
            return "Cannot perform operation: record is referenced by other records";
        }
        
        return "Operation failed";
    }

    private void addSkipped(List<AthleteBatchMigrationResponseSkippedInner> skipped,
                            AthleteBatchMigrationRequestItem item, String reason) {
        AthleteBatchMigrationResponseSkippedInner skippedItem = new AthleteBatchMigrationResponseSkippedInner();
        skippedItem.setAthlete(item);
        skippedItem.setReason(reason);
        skipped.add(skippedItem);
    }

}

