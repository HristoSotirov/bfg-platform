package com.bfg.platform.club.service;

import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.mapper.ClubMapper;
import com.bfg.platform.club.query.ClubQueryAdapter;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.PhotoUploadException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.FacetQueryService;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.storage.S3Service;
import com.bfg.platform.gen.model.ClubBatchCreateRequest;
import com.bfg.platform.gen.model.ClubBatchCreateRequestItem;
import com.bfg.platform.gen.model.ClubBatchCreateResponse;
import com.bfg.platform.gen.model.ClubBatchCreateResponseSkippedInner;
import com.bfg.platform.gen.model.ClubCreateRequest;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.ClubFacets;
import com.bfg.platform.gen.model.ClubUpdateRequest;
import com.bfg.platform.user.entity.User;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
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
    private final com.bfg.platform.user.repository.UserRepository userRepository;
    private final FacetQueryService facetQueryService;
    private final S3Service s3Service;
    private static final String LOGO_BUCKET_NAME = "bfg-platform-logos";

    // GET methods (Read)
    @Override
    public ListResult<ClubDto, ClubFacets> getAllClubs(String filter, String search, String orderBy, Integer top, Integer skip) {
        Specification<Club> filterSpec = ClubQueryAdapter.parseFilter(filter);
        Specification<Club> searchSpec = ClubQueryAdapter.parseSearch(search);
        Specification<Club> spec = Specification.where(filterSpec).and(searchSpec);
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, ClubQueryAdapter.parseSort(orderBy));

        Page<Club> page = clubRepository.findAll(spec, pageable);
        ClubFacets facets = new ClubFacets()
                .isActive(facetQueryService.buildFacetOptions(Club.class, spec, "isActive"));
        return new ListResult<>(page.map(ClubMapper::toDto), facets);
    }

    @Override
    public Optional<ClubDto> getClubByAdminId(UUID adminId) {
        return clubRepository.findByClubAdmin(adminId)
                .map(ClubMapper::toDto);
    }

    @Override
    public Optional<ClubDto> getClubDtoByUuid(UUID uuid) {
        return clubRepository.findWithAdminById(uuid)
                .map(ClubMapper::toDto);
    }

    // POST methods (Create)
    @Override
    @Transactional
    public Optional<ClubDto> createClub(ClubCreateRequest request) {
        validateClubAdmin(request.getClubAdminId());

        String cardPrefix = findNextCardPrefix();

        Club club = ClubMapper.fromCreateRequest(request, cardPrefix);

        try {
            Club savedClub = clubRepository.save(club);
            return Optional.of(ClubMapper.toDto(savedClub));
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractConflictReason(e));
        }
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
            processClubMigrationItem(item, created, skipped);
        }
        
        return buildBatchResponse(created, skipped);
    }

    // PATCH methods (Update)
    @Override
    @Transactional
    public Optional<ClubDto> updateClub(UUID uuid, ClubUpdateRequest request) {
        try {
            return clubRepository.findById(uuid)
                    .map(club -> {
                        ClubMapper.updateClubFromRequest(club, request);
                        Club savedClub = clubRepository.save(club);
                        return ClubMapper.toDto(savedClub);
                    });

        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractConflictReason(e));
        }
    }

    @Override
    @Transactional
    public Optional<ClubDto> updateClubLogo(UUID uuid, MultipartFile file) {
        validateLogoFile(file);
        return clubRepository.findById(uuid)
                .map(club -> {
                    String objectName = generateLogoObjectName(uuid, file.getOriginalFilename());
                    String contentType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
                    try {
                        String logoUrl = s3Service.uploadFile(
                                LOGO_BUCKET_NAME,
                                objectName,
                                file.getInputStream(),
                                contentType,
                                file.getSize()
                        );
                        club.setLogoUrl(logoUrl);
                        Club savedClub = clubRepository.save(club);
                        return ClubMapper.toDto(savedClub);
                    } catch (PhotoUploadException e) {
                        throw e;
                    } catch (IOException e) {
                        throw new PhotoUploadException("Failed to read file: " + e.getMessage());
                    } catch (Exception e) {
                        throw new PhotoUploadException("Failed to upload club logo: " + e.getMessage());
                    }
                });
    }

    // DELETE methods
    @Override
    @Transactional
    public void deleteClub(UUID uuid) {
        Club club = clubRepository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Club", uuid));

        try {
            clubRepository.delete(club);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractClubDeleteConflictReason(e));
        }
    }

    // Helper methods
    private void processClubMigrationItem(ClubBatchCreateRequestItem item,
                                          List<ClubDto> created,
                                          List<ClubBatchCreateResponseSkippedInner> skipped) {
        User adminUser = userRepository.findByUsername(item.getAdminEmail())
                .orElse(null);

        String skipReason = validateClubMigrationItem(item, adminUser);
        if (skipReason != null) {
            addSkipped(skipped, item, skipReason);
            return;
        }

        Club club = ClubMapper.fromBatchCreateRequestItem(item, adminUser.getId());

        try {
            Club savedClub = clubRepository.save(club);
            created.add(ClubMapper.toDto(savedClub));
        } catch (DataIntegrityViolationException e) {
            addSkipped(skipped, item, extractConflictReason(e));
        } catch (Exception e) {
            addSkipped(skipped, item, "Error: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }
    }

    private String validateClubMigrationItem(ClubBatchCreateRequestItem item, User adminUser) {
        if (adminUser == null) {
            return "Admin user with email '" + item.getAdminEmail() + "' not found";
        }

        if (!userRepository.isClubAdmin(adminUser.getId())) {
            return "User must have CLUB_ADMIN role to be assigned as club administrator";
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
    private void validateLogoFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Logo file is required");
        }
        if (file.getSize() > 10 * 1024 * 1024) { // 10MB limit
            throw new ValidationException("File size exceeds 10MB limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/"))) {
            throw new ValidationException("File must be an image");
        }
    }

    private String generateLogoObjectName(UUID clubId, String originalFilename) {
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".jpg";
        return String.format("clubs/%s/logo/%s%s", clubId, UUID.randomUUID(), extension);
    }

    private void validateClubAdmin(UUID clubAdminId) {
        if (!userRepository.isClubAdmin(clubAdminId)) {
            throw new ValidationException("User is not assigned the CLUB_ADMIN role оr does not exist");
        }
    }

    /**
     * Finds the next card prefix by getting MAX + 1.
     * Uses pessimistic lock to ensure thread-safety.
     * Gaps in the sequence are acceptable.
     * Returns "01" by default if no clubs exist.
     * 
     * @return Next card prefix formatted as two-digit string (e.g., "01", "02", ..., "99")
     * @throws ValidationException if next prefix would exceed 99
     */
    @Transactional
    private String findNextCardPrefix() {
        String prefix = clubRepository.findNextCardPrefix();
        if (prefix == null) {
            return "01";
        }
        int prefixNum = Integer.parseInt(prefix);
        if (prefixNum > 99) {
            throw new ValidationException("All card prefixes (01-99) are already in use.");
        }
        return prefix;
    }

    private String extractConflictReason(DataIntegrityViolationException e) {
        String message = e.getMessage();
        if (message == null) return "Club with these details already exists";
        
        String lowerMessage = message.toLowerCase();
        
        // Check exact constraint names and columns from Liquibase
        if (lowerMessage.contains("clubs_short_name_key") || 
            lowerMessage.matches(".*short_name.*unique.*|.*unique.*short_name.*")) {
            return "Club with this short name already exists";
        }
        if (lowerMessage.contains("clubs_name_key") || 
            lowerMessage.matches(".*clubs\\.name.*unique.*|.*unique.*clubs\\.name.*")) {
            return "Club with this name already exists";
        }
        if (lowerMessage.contains("clubs_card_prefix_key") || 
            lowerMessage.matches(".*card_prefix.*unique.*|.*unique.*card_prefix.*")) {
            return "Club with this card prefix already exists";
        }
        if (lowerMessage.contains("clubs_club_email_key") || 
            lowerMessage.matches(".*club_email.*unique.*|.*unique.*club_email.*")) {
            return "Club with this email already exists";
        }
        
        return "Club with these details already exists";
    }

    private String extractClubDeleteConflictReason(DataIntegrityViolationException e) {
        String message = e.getMessage();
        if (message == null) return "Cannot delete club: club is referenced by other records";
        
        String lowerMessage = message.toLowerCase();
        
        // Check exact foreign key constraint names from Liquibase
        if (lowerMessage.contains("fk_club_coaches_club_id")) {
            return "Cannot delete club: club has assigned coaches";
        }
        if (lowerMessage.contains("fk_accreditations_club_id")) {
            return "Cannot delete club: club has accreditations";
        }
        
        return "Cannot delete club: club is referenced by other records";
    }

    private void addSkipped(List<ClubBatchCreateResponseSkippedInner> skipped,
                            ClubBatchCreateRequestItem item, String reason) {
        ClubBatchCreateResponseSkippedInner skippedItem = new ClubBatchCreateResponseSkippedInner();
        skippedItem.setClub(item);
        skippedItem.setReason(reason);
        skipped.add(skippedItem);
    }

}

