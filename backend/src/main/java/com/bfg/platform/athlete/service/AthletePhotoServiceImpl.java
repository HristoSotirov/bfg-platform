package com.bfg.platform.athlete.service;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.repository.AccreditationRepository;
import com.bfg.platform.athlete.service.AccreditationService;
import com.bfg.platform.athlete.entity.AthletePhotoHistory;
import com.bfg.platform.athlete.mapper.AthletePhotoMapper;
import com.bfg.platform.athlete.repository.AthletePhotoHistoryRepository;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.common.exception.PhotoUploadException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.security.AuthorizationService;
import com.bfg.platform.common.storage.S3Service;
import com.bfg.platform.athlete.query.AthletePhotoQueryAdapter;
import com.bfg.platform.common.query.FacetQueryService;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.AthletePhotoFacets;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.Year;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class AthletePhotoServiceImpl implements AthletePhotoService {

    private final AthletePhotoHistoryRepository photoHistoryRepository;
    private final AthleteRepository athleteRepository;
    private final S3Service s3Service;
    private final ClubRepository clubRepository;
    private final AuthorizationService authorizationService;
    private final FacetQueryService facetQueryService;
    private final AccreditationRepository accreditationRepository;
    private final AccreditationService accreditationService;
    private static final String BUCKET_NAME = "bfg-platform-photos";

    @Override
    @Transactional
    public Optional<com.bfg.platform.gen.model.AthletePhotoDto> uploadPhoto(UUID athleteId, MultipartFile file) {
        validateUuid(athleteId);
        validateFile(file);

        // Verify athlete exists
        if (!athleteRepository.existsById(athleteId)) {
            throw new ResourceNotFoundException("Athlete", athleteId);
        }

        // Get current user's club ID
        UUID clubId = authorizationService.requireCurrentUserClubId();
        
        // Validate that athlete has an active accreditation for current year with the same club
        // and status is "New Photo Required"
        int currentYear = Year.now().getValue();
        Optional<Accreditation> accreditation = accreditationRepository
                .findFirstByAthleteIdAndClubIdAndYearOrderByCreatedAtDesc(athleteId, clubId, currentYear);
        
        if (accreditation.isEmpty()) {
            throw new ValidationException(
                    "Cannot upload photo: athlete does not have an active accreditation for " + currentYear + 
                    " with this club");
        }
        
        Accreditation acc = accreditation.get();
        if (acc.getStatus() != AccreditationStatus.NEW_PHOTO_REQUIRED) {
            throw new ValidationException(
                    "Cannot upload photo: accreditation status must be 'New Photo Required'. Current status: " + 
                    acc.getStatus().getValue());
        }

        try {
            String objectName = generateObjectName(athleteId, file.getOriginalFilename());
            String contentType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

            InputStream inputStream = file.getInputStream();
            String photoUrl = s3Service.uploadFile(BUCKET_NAME, objectName, inputStream, contentType, file.getSize());

            AthletePhotoHistory photoHistory = AthletePhotoMapper.createPhotoHistory(athleteId, photoUrl, clubId);
            AthletePhotoHistory saved = photoHistoryRepository.save(photoHistory);
            
            // Reload with relations to get uploadedByClub
            AthletePhotoHistory savedWithRelations = photoHistoryRepository.findWithRelationsById(saved.getId())
                    .orElse(saved);
            
            // Update accreditation status to "Pending photo validation" using service
            accreditationService.updateAccreditation(acc.getId(), AccreditationStatus.PENDING_PHOTO_VALIDATION);
            
            return Optional.of(AthletePhotoMapper.toDto(savedWithRelations));
        } catch (PhotoUploadException e) {
            throw e;
        } catch (IOException e) {
            throw new PhotoUploadException("Failed to read file: " + e.getMessage());
        } catch (Exception e) {
            throw new PhotoUploadException("Failed to upload photo: " + e.getMessage());
        }
    }

    @Override
    public ListResult<com.bfg.platform.gen.model.AthletePhotoDto, AthletePhotoFacets> getPhotoHistory(
            UUID athleteId,
            String filter,
            String orderBy,
            Integer top,
            Integer skip
    ) {
        validateUuid(athleteId);
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, AthletePhotoQueryAdapter.parseSort(orderBy));
        Specification<AthletePhotoHistory> spec = Specification
                .where(AthletePhotoQueryAdapter.parseFilter(filter))
                .and((root, query, cb) -> cb.equal(root.get("athleteId"), athleteId));
        var page = photoHistoryRepository.findAll(
                        spec,
                        pageable
                )
                .map(AthletePhotoMapper::toDto);

        AthletePhotoFacets facets = new AthletePhotoFacets()
                .athleteId(facetQueryService.buildFacetOptions(
                        com.bfg.platform.athlete.entity.AthletePhotoHistory.class,
                        spec,
                        "athleteId"
                ));
        return new ListResult<>(page, facets);
    }

    private String generateObjectName(UUID athleteId, String originalFilename) {
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".jpg";
        return String.format("athletes/%s/%s%s", athleteId, UUID.randomUUID(), extension);
    }

    private void validateUuid(UUID uuid) {
        if (uuid == null) {
            throw new ValidationException("UUID cannot be null");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("File is required");
        }
        if (file.getSize() > 10 * 1024 * 1024) { // 10MB limit
            throw new ValidationException("File size exceeds 10MB limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/"))) {
            throw new ValidationException("File must be an image");
        }
    }
}

