package com.bfg.platform.athlete.service;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.mapper.AccreditationMapper;
import com.bfg.platform.athlete.repository.AccreditationRepository;
import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.athlete.mapper.AthleteMapper;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.security.AuthorizationService;
import com.bfg.platform.common.security.ResourceType;
import com.bfg.platform.common.security.ScopeAccessValidator;
import com.bfg.platform.athlete.query.AccreditationQueryAdapter;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.repository.DynamicEntityGraph;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.Set;
import com.bfg.platform.gen.model.AccreditationBatchRenewalRequest;
import com.bfg.platform.gen.model.AccreditationBatchRenewalResponse;
import com.bfg.platform.gen.model.AccreditationBatchRenewalResponseFailedInner;
import com.bfg.platform.gen.model.AccreditationDto;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.AthleteBatchMigrationRequest;
import com.bfg.platform.gen.model.AthleteBatchMigrationRequestItem;
import com.bfg.platform.gen.model.AthleteBatchMigrationResponse;
import com.bfg.platform.gen.model.AthleteBatchMigrationResponseSkippedInner;
import com.bfg.platform.gen.model.AthleteCreateRequest;
import com.bfg.platform.gen.model.AthleteDto;
import com.bfg.platform.gen.model.ScopeType;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
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
    private final ScopeAccessValidator scopeAccessValidator;
    private final PlatformTransactionManager transactionManager;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<AccreditationDto> getAllAccreditations(
            String filter,
            String search,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    ) {
        // Validate scope and club access - throws 403 if invalid
        scopeAccessValidator.validateFilterScope(filter);
        scopeAccessValidator.validateFilterClub(filter, ResourceType.ACCREDITATION);

        Set<String> requestedExpand = ExpandQueryParser.parse(expand, Accreditation.class);
        
        EnhancedFilterExpressionParser.ParseResult<Accreditation> filterResult = 
                AccreditationQueryAdapter.parseFilter(filter, requestedExpand);
        Specification<Accreditation> filterSpec = filterResult.getSpecification();
        Set<String> usedInFilter = filterResult.getUsedExpandFields();
        
        Specification<Accreditation> searchSpec = AccreditationQueryAdapter.parseSearch(search);
        
        Specification<Accreditation> spec = Specification.where(filterSpec).and(searchSpec);
        
        EnhancedSortParser.ParseResult sortResult = 
                AccreditationQueryAdapter.parseSort(orderBy, requestedExpand);
        Sort sort = sortResult.getSort();
        Set<String> usedInSort = sortResult.getUsedExpandFields();
        
        Set<String> allExpandFields = new java.util.HashSet<>(requestedExpand);
        allExpandFields.addAll(usedInFilter);
        allExpandFields.addAll(usedInSort);
        
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);
        
        Page<Accreditation> page;
        if (!allExpandFields.isEmpty()) {
            EntityGraph<Accreditation> entityGraph = DynamicEntityGraph.create(entityManager, Accreditation.class, allExpandFields);
            page = findAllWithEntityGraph(spec, pageable, entityGraph);
        } else {
            page = accreditationRepository.findAll(spec, pageable);
        }
        
        return page.map(acc -> AccreditationMapper.toDto(acc, allExpandFields));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AccreditationDto> getAccreditationByUuid(UUID uuid, List<String> expand) {
        validateUuid(uuid);
        Set<String> requestedExpand = ExpandQueryParser.parse(expand, Accreditation.class);
        
        Accreditation accreditation;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<Accreditation> entityGraph = DynamicEntityGraph.create(entityManager, Accreditation.class, requestedExpand);
            java.util.Map<String, Object> hints = new java.util.HashMap<>();
            hints.put("jakarta.persistence.loadgraph", entityGraph);
            accreditation = entityManager.find(Accreditation.class, uuid, hints);
        } else {
            accreditation = accreditationRepository.findById(uuid).orElse(null);
        }
        
        if (accreditation != null) {
            // Validate access to this specific resource
            scopeAccessValidator.validateResourceAccess(
                    accreditation.getScopeType(),
                    accreditation.getClubId(),
                    ResourceType.ACCREDITATION
            );
        }
        return Optional.ofNullable(accreditation)
                .map(acc -> AccreditationMapper.toDto(acc, requestedExpand));
    }

    @Override
    public AccreditationBatchRenewalResponse batchRenewAccreditations(
            AccreditationBatchRenewalRequest request) {
        UUID clubId = authorizationService.requireCurrentUserClubId();
        authorizationService.requireCanManageAccreditations(clubId);

        List<AccreditationDto> renewed = new ArrayList<>();
        List<AccreditationBatchRenewalResponseFailedInner> failed = new ArrayList<>();
        
        if (request.getAthleteIds() == null || request.getAthleteIds().isEmpty()) {
            AccreditationBatchRenewalResponse response = 
                    new AccreditationBatchRenewalResponse();
            response.setRenewed(renewed);
            response.setFailed(failed);
            return response;
        }

        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ValidationException("Club not found"));

        int currentYear = Year.now().getValue();
        
        List<UUID> athleteIds = request.getAthleteIds();
        List<Athlete> athletes = athleteRepository.findAllById(athleteIds);
        java.util.Map<UUID, Athlete> athleteMap = athletes.stream()
                .collect(java.util.stream.Collectors.toMap(Athlete::getId, a -> a));

        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        
        for (UUID athleteId : athleteIds) {
            transactionTemplate.execute(status -> {
                try {
                    Athlete athlete = athleteMap.get(athleteId);
                    if (athlete == null) {
                        throw new ValidationException("Athlete not found");
                    }
                    if (!athlete.getScopeType().equals(club.getScopeType())) {
                        throw new ValidationException(
                            "Athlete scope type does not match club (cannot create accreditation for different scope type)");
                    }

                    boolean exists = accreditationRepository.existsByAthleteIdAndClubIdAndYear(athleteId, clubId, currentYear);
                    
                    if (exists) {
                        throw new ConflictException("Accreditation for this athlete and year already exists");
                    }

                    String cardNumber;
                    Optional<String> existingCardNumber = accreditationRepository
                            .findExistingCardNumberForAthleteAndClub(athleteId, clubId);

                    if (existingCardNumber.isPresent()) {
                        cardNumber = existingCardNumber.get();
                    } else {
                        cardNumber = generateNextCardNumber(club.getCardPrefix(), clubId);
                    }

                    Accreditation accreditation = AccreditationMapper.createNewAccreditation(
                            athleteId,
                            clubId,
                            cardNumber,
                            currentYear,
                            club.getScopeType(),
                            AccreditationStatus.PENDING_VALIDATION
                    );

                    Accreditation saved = accreditationRepository.save(accreditation);
                    renewed.add(AccreditationMapper.toDto(saved));
                } catch (ValidationException | ConflictException e) {
                    Athlete athlete = athleteMap.get(athleteId);
                    String athleteName = getAthleteName(athlete);
                    addFailed(failed, athleteId, athleteName, e.getMessage());
                    status.setRollbackOnly();
                } catch (Exception e) {
                    Athlete athlete = athleteMap.get(athleteId);
                    String athleteName = getAthleteName(athlete);
                    String errorMessage = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                    addFailed(failed, athleteId, athleteName, "Error: " + errorMessage);
                    status.setRollbackOnly();
                }
                return null;
            });
        }
        
        AccreditationBatchRenewalResponse response = 
                new AccreditationBatchRenewalResponse();
        response.setRenewed(renewed);
        response.setFailed(failed);
        return response;
    }

    private String getAthleteName(Athlete athlete) {
        if (athlete == null) return null;
        String first = athlete.getFirstName() != null ? athlete.getFirstName().trim() : "";
        String middle = athlete.getMiddleName() != null ? athlete.getMiddleName().trim() : "";
        String last = athlete.getLastName() != null ? athlete.getLastName().trim() : "";
        String combined = (first + " " + middle + " " + last).trim().replaceAll("\\s+", " ");
        return combined.isEmpty() ? null : combined;
    }

    private void addFailed(
            List<AccreditationBatchRenewalResponseFailedInner> failed,
            UUID athleteId,
            String athleteName,
            String error) {
        AccreditationBatchRenewalResponseFailedInner failedItem = 
                new AccreditationBatchRenewalResponseFailedInner();
        failedItem.setAthleteId(athleteId);
        failedItem.setAthleteName(athleteName);
        failedItem.setError(error);
        failed.add(failedItem);
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
            if (!athlete.getScopeType().equals(club.getScopeType())) {
                throw new ValidationException(
                    "Cannot create accreditation: athlete scope type does not match club (e.g. cannot create national accreditation for internal athlete)");
            }
            Optional<String> existingCardNumber = accreditationRepository
                    .findExistingCardNumberForAthleteAndClub(athlete.getId(), clubId);

            cardNumber = existingCardNumber.orElseGet(() -> generateNextCardNumber(club.getCardPrefix(), clubId));
        } else {
            athlete = saveAthlete(AthleteMapper.fromCreateRequest(request, club.getScopeType()));
            cardNumber = generateNextCardNumber(club.getCardPrefix(), clubId);
        }

        Accreditation accreditation = AccreditationMapper.createNewAccreditation(
                athlete.getId(),
                clubId,
                cardNumber,
                Year.now().getValue(),
                club.getScopeType(),
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

    @Override
    @Transactional
    public Optional<AccreditationDto> updateAccreditationStatus(UUID uuid, AccreditationStatus status) {
        validateUuid(uuid);
        
        if (status == null) {
            throw new ValidationException("Status is required for accreditation update");
        }
        
        return accreditationRepository.findById(uuid)
                .map(accreditation -> {
                    accreditation.setStatus(status);
                    
                    Accreditation saved = accreditationRepository.save(accreditation);
                    return AccreditationMapper.toDto(saved);
                });
    }

    @Override
    @Transactional
    public void deleteAccreditation(UUID uuid) {
        validateUuid(uuid);
        if (!accreditationRepository.existsById(uuid)) {
            throw new ResourceNotFoundException("Accreditation", uuid);
        }
        accreditationRepository.deleteById(uuid);
    }

    private void validateUuid(UUID uuid) {
        if (uuid == null) {
            throw new ValidationException("Accreditation UUID cannot be null");
        }
    }


    private AthleteDto migrateSingleAthlete(AthleteBatchMigrationRequestItem item, Integer year, int currentYear) {
        String newCardNumber = parseAndConvertCardNumber(item.getOldCardNumber());
        Club club = clubRepository.findByCardPrefix(newCardNumber.substring(0, 2))
                .orElseThrow(() -> new ValidationException(
                "No club found with card prefix: " + newCardNumber.substring(0, 2)
        ));

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
                ScopeType.INTERNAL,
                status
        );
        
        saveAccreditation(accreditation);
        return AthleteMapper.toDto(athlete);
    }

    private String parseAndConvertCardNumber(String oldCardNumber) {
        if (oldCardNumber.length() == 6) {
            return oldCardNumber;
        }
        
        String clubPrefix;
        String athleteSuffix;
        
        if (oldCardNumber.length() == 4) {
            clubPrefix = normalizeClubPrefix(oldCardNumber.substring(0, 1));
            athleteSuffix = oldCardNumber.substring(1);
        } else if (oldCardNumber.length() == 5) {
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
        accreditationRepository.save(accreditation);
    }

    private Athlete saveAthlete(Athlete athlete) {
        return athleteRepository.save(athlete);
    }


    private void addSkipped(List<AthleteBatchMigrationResponseSkippedInner> skipped,
                            AthleteBatchMigrationRequestItem item, String reason) {
        AthleteBatchMigrationResponseSkippedInner skippedItem = new AthleteBatchMigrationResponseSkippedInner();
        skippedItem.setAthlete(item);
        skippedItem.setReason(reason);
        skipped.add(skippedItem);
    }

    private Page<Accreditation> findAllWithEntityGraph(
            Specification<Accreditation> spec, 
            Pageable pageable, 
            EntityGraph<Accreditation> entityGraph) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Accreditation> query = cb.createQuery(Accreditation.class);
        Root<Accreditation> root = query.from(Accreditation.class);
        
        Predicate predicate = spec != null ? spec.toPredicate(root, query, cb) : cb.conjunction();
        if (predicate != null) {
            query.where(predicate);
        }
        
        if (pageable.getSort().isSorted()) {
            List<jakarta.persistence.criteria.Order> orders = new java.util.ArrayList<>();
            pageable.getSort().forEach(order -> {
                jakarta.persistence.criteria.Path<?> path = resolvePath(root, order.getProperty());
                if (order.isAscending()) {
                    orders.add(cb.asc(path));
                } else {
                    orders.add(cb.desc(path));
                }
            });
            query.orderBy(orders);
        }
        
        TypedQuery<Accreditation> typedQuery = entityManager.createQuery(query);
        
        if (entityGraph != null) {
            typedQuery.setHint("jakarta.persistence.loadgraph", entityGraph);
        }
        
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        
        List<Accreditation> content = typedQuery.getResultList();
        
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Accreditation> countRoot = countQuery.from(Accreditation.class);
        Predicate countPredicate = spec != null ? spec.toPredicate(countRoot, countQuery, cb) : cb.conjunction();
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }
        countQuery.select(cb.count(countRoot));
        Long total = entityManager.createQuery(countQuery).getSingleResult();
        
        return new org.springframework.data.domain.PageImpl<>(content, pageable, total);
    }
    
    private jakarta.persistence.criteria.Path<?> resolvePath(Root<Accreditation> root, String property) {
        String[] parts = property.split("\\.");
        jakarta.persistence.criteria.Path<?> path = root;
        for (String part : parts) {
            path = path.get(part);
        }
        return path;
    }

}

