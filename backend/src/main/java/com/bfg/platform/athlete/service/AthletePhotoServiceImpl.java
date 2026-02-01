package com.bfg.platform.athlete.service;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.repository.AccreditationRepository;
import com.bfg.platform.athlete.service.AccreditationService;
import com.bfg.platform.athlete.entity.AthletePhotoHistory;
import com.bfg.platform.athlete.mapper.AthletePhotoMapper;
import com.bfg.platform.athlete.repository.AthletePhotoHistoryRepository;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.common.exception.PhotoUploadException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.security.AuthorizationService;
import com.bfg.platform.common.storage.S3Service;
import static com.bfg.platform.common.storage.S3Service.FileType;
import com.bfg.platform.athlete.query.AthletePhotoQueryAdapter;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.AthletePhotoDto;
import org.springframework.data.domain.Page;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Year;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class AthletePhotoServiceImpl implements AthletePhotoService {

    private final AthletePhotoHistoryRepository photoHistoryRepository;
    private final AthleteRepository athleteRepository;
    private final S3Service s3Service;
    private final AuthorizationService authorizationService;
    private final AccreditationRepository accreditationRepository;
    private final AccreditationService accreditationService;

    @Override
    @Transactional
    public Optional<AthletePhotoDto> uploadPhoto(UUID athleteId, MultipartFile file) {
        validateUuid(athleteId);

        if (!athleteRepository.existsById(athleteId)) {
            throw new ResourceNotFoundException("Athlete", athleteId);
        }

        UUID clubId = authorizationService.requireCurrentUserClubId();
        
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
            String photoUrl = s3Service.uploadImageFile(
                    FileType.ATHLETE_PHOTO,
                    athleteId,
                    file
            );

            AthletePhotoHistory photoHistory = AthletePhotoMapper.createPhotoHistory(athleteId, photoUrl, clubId);
            AthletePhotoHistory saved = photoHistoryRepository.save(photoHistory);
            
            AthletePhotoHistory savedWithRelations = photoHistoryRepository.findWithRelationsById(saved.getId())
                    .orElse(saved);
            
            accreditationService.updateAccreditationStatus(acc.getId(), AccreditationStatus.PENDING_PHOTO_VALIDATION);
            
            return Optional.of(AthletePhotoMapper.toDto(savedWithRelations, java.util.Collections.emptySet()));
        } catch (PhotoUploadException e) {
            throw e;
        } catch (IOException e) {
            throw new PhotoUploadException("Failed to read file: " + e.getMessage());
        } catch (Exception e) {
            throw new PhotoUploadException("Failed to upload photo: " + e.getMessage());
        }
    }

    @Override
    public Page<AthletePhotoDto> getPhotoHistory(
            UUID athleteId,
            String filter,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    ) {
        validateUuid(athleteId);
        
        java.util.Set<String> requestedExpand = ExpandQueryParser.parse(expand, AthletePhotoHistory.class);
        
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, AthletePhotoQueryAdapter.parseSort(orderBy));
        Specification<AthletePhotoHistory> spec = Specification
                .where(AthletePhotoQueryAdapter.parseFilter(filter))
                .and((root, query, cb) -> cb.equal(root.get("athleteId"), athleteId));
        
        return photoHistoryRepository.findAll(spec, pageable)
                .map(photo -> AthletePhotoMapper.toDto(photo, requestedExpand));
    }

    private void validateUuid(UUID uuid) {
        if (uuid == null) {
            throw new ValidationException("UUID cannot be null");
        }
    }
}

