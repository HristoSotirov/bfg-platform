package com.bfg.platform.club.service;

import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.mapper.ClubMapper;
import com.bfg.platform.club.query.ClubQueryAdapter;
import com.bfg.platform.club.repository.ClubCoachRepository;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.PhotoUploadException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.i18n.MessageResolver;
import com.bfg.platform.common.security.ResourceType;
import com.bfg.platform.common.security.ScopeAccessValidator;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.repository.DynamicEntityGraph;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Sort;
import java.util.Set;
import com.bfg.platform.common.storage.S3Service;
import static com.bfg.platform.common.storage.S3Service.FileType;
import com.bfg.platform.gen.model.ClubBatchCreateRequest;
import com.bfg.platform.gen.model.ClubBatchCreateRequestItem;
import com.bfg.platform.gen.model.ClubBatchCreateResponse;
import com.bfg.platform.gen.model.ClubBatchCreateResponseSkippedInner;
import com.bfg.platform.gen.model.ClubCreateRequest;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.ClubUpdateRequest;
import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class ClubServiceImpl implements ClubService {

    private final ClubRepository clubRepository;
    private final ClubCoachRepository clubCoachRepository;
    private final UserRepository userRepository;
    private final S3Service s3Service;
    private final EntityManager entityManager;
    private final PlatformTransactionManager transactionManager;
    private final ScopeAccessValidator scopeAccessValidator;
    private final com.bfg.platform.common.security.SecurityContextHelper securityContextHelper;
    private final MessageResolver messageResolver;

    @Override
    @Transactional(readOnly = true)
    public Page<ClubDto> getAllClubs(String filter, String search, List<String> orderBy, Integer top, Integer skip, List<String> expand) {
        // Validate scope filter - throws 403 if invalid
        scopeAccessValidator.validateFilterScope(filter);

        Set<String> requestedExpand = ExpandQueryParser.parse(expand, Club.class);

        EnhancedFilterExpressionParser.ParseResult<Club> filterResult =
                ClubQueryAdapter.parseFilter(filter, requestedExpand);
        Specification<Club> filterSpec = filterResult.getSpecification();

        Specification<Club> searchSpec = ClubQueryAdapter.parseSearch(search);

        Specification<Club> scopeSpec = scopeAccessValidator.buildScopeRestriction(ResourceType.CLUB, "type");

        Specification<Club> spec = Specification.where(filterSpec).and(searchSpec).and(scopeSpec);
        
        EnhancedSortParser.ParseResult sortResult = 
                ClubQueryAdapter.parseSort(orderBy, requestedExpand);
        Sort sort = sortResult.getSort();
        
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        Page<Club> page;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<Club> entityGraph = DynamicEntityGraph.create(entityManager, Club.class, requestedExpand);
            page = findAllWithEntityGraph(spec, pageable, entityGraph);
        } else {
            page = clubRepository.findAll(spec, pageable);
        }
        
        final int presignedExpirySeconds = 3600;
        return page.map(club -> {
            ClubDto dto = ClubMapper.toDto(club, requestedExpand);
            String logoPath = club.getLogoUrl();
            if (logoPath != null && !logoPath.isBlank()) {
                parseBucketAndObject(logoPath)
                    .map(pair -> s3Service.getPresignedUrl(pair.bucket(), pair.objectName(), presignedExpirySeconds))
                    .filter(url -> url != null && !url.isBlank())
                    .ifPresent(dto::setLogoUrl);
            }
            return dto;
        });
    }

    @Override
    public Optional<ClubDto> getClubByAdminId(UUID adminId, List<String> expand) {
        Set<String> requestedExpand = ExpandQueryParser.parse(expand, Club.class);
        
        final int presignedExpirySeconds = 3600;
        return clubRepository.findByClubAdmin(adminId)
                .map(club -> {
                    ClubDto dto = ClubMapper.toDto(club, requestedExpand);
                    String logoPath = club.getLogoUrl();
                    if (logoPath != null && !logoPath.isBlank()) {
                        parseBucketAndObject(logoPath)
                            .map(pair -> s3Service.getPresignedUrl(pair.bucket(), pair.objectName(), presignedExpirySeconds))
                            .filter(url -> url != null && !url.isBlank())
                            .ifPresent(dto::setLogoUrl);
                    }
                    return dto;
                });
    }

    @Override
    public Optional<ClubDto> getClubDtoByUuid(UUID uuid, List<String> expand) {
        Set<String> requestedExpand = ExpandQueryParser.parse(expand, Club.class);
        
        Club club;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<Club> entityGraph = DynamicEntityGraph.create(entityManager, Club.class, requestedExpand);
            java.util.Map<String, Object> hints = new java.util.HashMap<>();
            hints.put("jakarta.persistence.loadgraph", entityGraph);
            club = entityManager.find(Club.class, uuid, hints);
        } else {
            club = clubRepository.findById(uuid).orElse(null);
        }
        
        if (club != null) {
            // Validate access - clubs don't have a clubId since they ARE the club
            scopeAccessValidator.validateResourceAccess(club.getType(), null, ResourceType.CLUB);
        }
        
        final int presignedExpirySeconds = 3600;
        return Optional.ofNullable(club)
                .map(c -> {
                    ClubDto dto = ClubMapper.toDto(c, requestedExpand);
                    String logoPath = c.getLogoUrl();
                    if (logoPath != null && !logoPath.isBlank()) {
                        parseBucketAndObject(logoPath)
                            .map(pair -> s3Service.getPresignedUrl(pair.bucket(), pair.objectName(), presignedExpirySeconds))
                            .filter(url -> url != null && !url.isBlank())
                            .ifPresent(dto::setLogoUrl);
                    }
                    return dto;
                });
    }

    @Override
    @Transactional
    public Optional<ClubDto> createClub(ClubCreateRequest request) {
        if (request.getClubAdminId() != null) {
            validateClubAdmin(request.getClubAdminId());
        }

        String cardPrefix = findNextCardPrefix(request.getType());

        Club club = ClubMapper.fromCreateRequest(request, cardPrefix);

        Club savedClub = clubRepository.save(club);
        entityManager.flush();
        
        final int presignedExpirySeconds = 3600;
        ClubDto dto = ClubMapper.toDto(savedClub);
        String logoPath = savedClub.getLogoUrl();
        if (logoPath != null && !logoPath.isBlank()) {
            parseBucketAndObject(logoPath)
                .map(pair -> s3Service.getPresignedUrl(pair.bucket(), pair.objectName(), presignedExpirySeconds))
                .filter(url -> url != null && !url.isBlank())
                .ifPresent(dto::setLogoUrl);
        }
        return Optional.of(dto);
    }

    @Override
    @Transactional
    public ClubBatchCreateResponse migrateClubs(ClubBatchCreateRequest request) {
        List<ClubDto> created = new ArrayList<>();
        List<ClubBatchCreateResponseSkippedInner> skipped = new ArrayList<>();
        
        if (request.getClubs().isEmpty()) {
            return buildBatchResponse(created, skipped);
        }
        
        for (ClubBatchCreateRequestItem item : request.getClubs()) {
            try {
                processClubMigrationItem(item, created, skipped);
            } catch (Exception e) {
                String reason = e instanceof DataIntegrityViolationException || e instanceof PersistenceException
                    ? ConstraintViolationMessageExtractor.extractMessage((Exception) e)
                    : "Failed to create club: " + e.getMessage();
                addSkipped(skipped, item, reason);
            }
        }
        
        return buildBatchResponse(created, skipped);
    }

    @Override
    @Transactional
    public Optional<ClubDto> updateClub(UUID uuid, ClubUpdateRequest request) {
        validateClubModifyPermission(uuid);
        final int presignedExpirySeconds = 3600;
        return clubRepository.findById(uuid)
                .map(club -> {
                    boolean deactivating = request.getIsActive() != null && !request.getIsActive();
                    if (deactivating) {
                        clubCoachRepository.deleteByClubId(club.getId());
                        club.setClubAdmin(null);
                    } else if (!club.isActive() && request.getClubAdminId() != null) {
                        throw new ValidationException(messageResolver.resolve("club.cannotAssignAdminToInactive"));
                    }
                    ClubMapper.updateClubFromRequest(club, request);
                    if (deactivating) {
                        club.setClubAdmin(null);
                    }
                    Club savedClub = clubRepository.save(club);
                    ClubDto dto = ClubMapper.toDto(savedClub);
                    String logoPath = savedClub.getLogoUrl();
                    if (logoPath != null && !logoPath.isBlank()) {
                        parseBucketAndObject(logoPath)
                            .map(pair -> s3Service.getPresignedUrl(pair.bucket(), pair.objectName(), presignedExpirySeconds))
                            .filter(url -> url != null && !url.isBlank())
                            .ifPresent(dto::setLogoUrl);
                    }
                    return dto;
                });
    }

    @Override
    @Transactional
    public Optional<ClubDto> updateClubLogo(UUID uuid, MultipartFile file) {
        final int presignedExpirySeconds = 3600;
        return clubRepository.findById(uuid)
                .map(club -> {
                    try {
                        String oldLogoUrl = club.getLogoUrl();
                        
                        String logoUrl = s3Service.uploadImageFile(
                                FileType.CLUB_LOGO,
                                uuid,
                                file
                        );
                        club.setLogoUrl(logoUrl);
                        Club savedClub = clubRepository.save(club);
                        
                        if (oldLogoUrl != null && !oldLogoUrl.isBlank()) {
                            deleteOldLogoFile(oldLogoUrl);
                        }
                        
                        ClubDto dto = ClubMapper.toDto(savedClub);
                        String logoPath = savedClub.getLogoUrl();
                        if (logoPath != null && !logoPath.isBlank()) {
                            parseBucketAndObject(logoPath)
                                .map(pair -> s3Service.getPresignedUrl(pair.bucket(), pair.objectName(), presignedExpirySeconds))
                                .filter(url -> url != null && !url.isBlank())
                                .ifPresent(dto::setLogoUrl);
                        }
                        return dto;
                    } catch (PhotoUploadException e) {
                        throw e;
                    } catch (IOException e) {
                        throw new PhotoUploadException(messageResolver.resolve("club.logoUploadFailed"));
                    } catch (Exception e) {
                        throw new PhotoUploadException(messageResolver.resolve("club.logoUploadFailed"));
                    }
                });
    }
    
    private Optional<BucketObject> parseBucketAndObject(String path) {
        String cleanPath = path.startsWith("/") ? path.substring(1) : path;
        String[] parts = cleanPath.split("/", 2);
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) return Optional.empty();
        return Optional.of(new BucketObject(parts[0], parts[1]));
    }
    
    private record BucketObject(String bucket, String objectName) {}
    
    private void deleteOldLogoFile(String logoUrl) {
        try {
            String path = logoUrl.startsWith("/") ? logoUrl.substring(1) : logoUrl;
            String[] parts = path.split("/", 2);
            if (parts.length == 2 && !parts[0].isBlank() && !parts[1].isBlank()) {
                s3Service.deleteFile(parts[0], parts[1]);
            }
        } catch (Exception e) {
            // Log but don't fail the operation if old file deletion fails
        }
    }

    @Override
    @Transactional
    public void deleteClub(UUID uuid) {
        Club club = clubRepository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Club", uuid));

        try {
            clubRepository.delete(club);
        } catch (DataIntegrityViolationException e) {
            String message = ConstraintViolationMessageExtractor.extractMessage(e);
            String lowerMessage = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (lowerMessage.contains("fk_club_coaches_club_id")) {
                message = "Cannot delete club: club has assigned coaches";
            } else if (lowerMessage.contains("fk_accreditations_club_id")) {
                message = "Cannot delete club: club has accreditations";
            }
            throw new ConflictException(message);
        }
    }

    private void processClubMigrationItem(ClubBatchCreateRequestItem item,
                                          List<ClubDto> created,
                                          List<ClubBatchCreateResponseSkippedInner> skipped) {
        User adminUser = null;
        if (item.getAdminEmail() != null && !item.getAdminEmail().isBlank()) {
            adminUser = userRepository.findByUsername(item.getAdminEmail())
                    .orElse(null);
        }

        String skipReason = validateClubMigrationItem(item, adminUser);
        if (skipReason != null) {
            addSkipped(skipped, item, skipReason);
            return;
        }

        UUID adminUserId = adminUser != null ? adminUser.getId() : null;
        Club club = ClubMapper.fromBatchCreateRequestItem(item, adminUserId);

        try {
            ClubDto dto = saveClubInNewTransaction(club);
            created.add(dto);
        } catch (DataIntegrityViolationException | PersistenceException e) {
            addSkipped(skipped, item, ConstraintViolationMessageExtractor.extractMessage((Exception) e));
        } catch (Exception e) {
            addSkipped(skipped, item, "Error: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }
    }

    private ClubDto saveClubInNewTransaction(Club club) {
        DefaultTransactionDefinition def = new DefaultTransactionDefinition(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        TransactionStatus status = transactionManager.getTransaction(def);
        try {
            Club saved = clubRepository.save(club);
            entityManager.flush();
            transactionManager.commit(status);
            
            final int presignedExpirySeconds = 3600;
            ClubDto dto = ClubMapper.toDto(saved);
            String logoPath = saved.getLogoUrl();
            if (logoPath != null && !logoPath.isBlank()) {
                parseBucketAndObject(logoPath)
                    .map(pair -> s3Service.getPresignedUrl(pair.bucket(), pair.objectName(), presignedExpirySeconds))
                    .filter(url -> url != null && !url.isBlank())
                    .ifPresent(dto::setLogoUrl);
            }
            return dto;
        } catch (Exception e) {
            transactionManager.rollback(status);
            throw e;
        }
    }

    private String validateClubMigrationItem(ClubBatchCreateRequestItem item, User adminUser) {
        if (item.getAdminEmail() != null && !item.getAdminEmail().isBlank()) {
            if (adminUser == null) {
                return "Admin user with email '" + item.getAdminEmail() + "' not found";
            }
            if (!userRepository.isClubAdmin(adminUser.getId())) {
                return "User must have CLUB_ADMIN role to be assigned as club administrator";
            }
        }

        String cardPrefix = item.getCardPrefix();

        if (cardPrefix == null || !cardPrefix.matches("^\\d{2}$")) {
            return "Card prefix must be exactly 2 digits (01-99)";
        }

        int prefixNumber = Integer.parseInt(cardPrefix);
        if (prefixNumber < 1 || prefixNumber > 99) {
            return "Card prefix must be between 01 and 99";
        }

        return null;
    }

    private ClubBatchCreateResponse buildBatchResponse(List<ClubDto> created,
                                                       List<ClubBatchCreateResponseSkippedInner> skipped) {
        ClubBatchCreateResponse response = new ClubBatchCreateResponse();
        response.setCreated(created);
        response.setSkipped(skipped);
        return response;
    }

    private void validateClubAdmin(UUID clubAdminId) {
        if (!userRepository.isClubAdmin(clubAdminId)) {
            throw new ValidationException(messageResolver.resolve("club.userNotClubAdmin"));
        }
    }

    private void validateClubModifyPermission(UUID clubId) {
        com.bfg.platform.gen.model.SystemRole role = securityContextHelper.getUserRole();
        if (role == com.bfg.platform.gen.model.SystemRole.APP_ADMIN || role == com.bfg.platform.gen.model.SystemRole.FEDERATION_ADMIN) {
            return;
        }
        if (role == com.bfg.platform.gen.model.SystemRole.CLUB_ADMIN) {
            UUID currentUserId = securityContextHelper.getUserId();
            Optional<Club> ownClub = clubRepository.findByClubAdmin(currentUserId);
            if (ownClub.isPresent() && ownClub.get().getId().equals(clubId)) {
                return;
            }
        }
        throw new com.bfg.platform.common.exception.ForbiddenException(messageResolver.resolve("club.modifyForbidden"));
    }

    @Transactional
    private String findNextCardPrefix(ScopeType type) {
        String prefix = clubRepository.findNextCardPrefix(type.name());
        if (prefix == null) {
            return "01";
        }
        int prefixNum = Integer.parseInt(prefix);
        if (prefixNum > 99) {
            throw new ValidationException(messageResolver.resolve("club.allPrefixesUsed", type));
        }
        return prefix;
    }


    private void addSkipped(List<ClubBatchCreateResponseSkippedInner> skipped,
                            ClubBatchCreateRequestItem item, String reason) {
        ClubBatchCreateResponseSkippedInner skippedItem = new ClubBatchCreateResponseSkippedInner();
        skippedItem.setClub(item);
        skippedItem.setReason(reason);
        skipped.add(skippedItem);
    }

    private Page<Club> findAllWithEntityGraph(
            Specification<Club> spec, 
            Pageable pageable, 
            EntityGraph<Club> entityGraph) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Club> query = cb.createQuery(Club.class);
        Root<Club> root = query.from(Club.class);
        
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
        
        TypedQuery<Club> typedQuery = entityManager.createQuery(query);
        
        if (entityGraph != null) {
            typedQuery.setHint("jakarta.persistence.loadgraph", entityGraph);
        }
        
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        
        List<Club> content = typedQuery.getResultList();
        
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Club> countRoot = countQuery.from(Club.class);
        Predicate countPredicate = spec != null ? spec.toPredicate(countRoot, countQuery, cb) : cb.conjunction();
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }
        countQuery.select(cb.count(countRoot));
        Long total = entityManager.createQuery(countQuery).getSingleResult();
        
        return new org.springframework.data.domain.PageImpl<>(content, pageable, total);
    }
    
    private jakarta.persistence.criteria.Path<?> resolvePath(Root<Club> root, String property) {
        String[] parts = property.split("\\.");
        jakarta.persistence.criteria.Path<?> path = root;
        for (String part : parts) {
            path = path.get(part);
        }
        return path;
    }

}

