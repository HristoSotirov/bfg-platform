package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
import com.bfg.platform.competition.mapper.CompetitionTimetableEventMapper;
import com.bfg.platform.competition.query.CompetitionTimetableEventQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.CompetitionTimetableEventRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.gen.model.CompetitionStatus;
import com.bfg.platform.gen.model.CompetitionTimetableEventDto;
import com.bfg.platform.gen.model.CompetitionTimetableEventRequest;
import jakarta.persistence.EntityManager;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class CompetitionTimetableEventServiceImpl implements CompetitionTimetableEventService {

    private static final String DRAFT_STATUS = CompetitionStatus.DRAFT.toString();

    private final CompetitionTimetableEventRepository repository;
    private final CompetitionRepository competitionRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionTimetableEventDto> getAll(String filter, List<String> orderBy, Integer top, Integer skip) {
        EnhancedFilterExpressionParser.ParseResult<CompetitionTimetableEvent> filterResult =
                CompetitionTimetableEventQueryAdapter.parseFilter(filter, null);
        Specification<CompetitionTimetableEvent> spec = filterResult.getSpecification();

        EnhancedSortParser.ParseResult sortResult = CompetitionTimetableEventQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        return repository.findAll(spec, pageable).map(CompetitionTimetableEventMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CompetitionTimetableEventDto> getByUuid(UUID uuid) {
        return repository.findById(uuid).map(CompetitionTimetableEventMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<CompetitionTimetableEventDto> create(CompetitionTimetableEventRequest request) {
        Competition competition = loadCompetition(request.getCompetitionId());
        validateScheduledAt(request.getScheduledAt(), competition);

        CompetitionTimetableEvent entity = CompetitionTimetableEventMapper.fromRequest(request);
        CompetitionTimetableEvent saved = repository.save(entity);
        entityManager.flush();
        return Optional.of(CompetitionTimetableEventMapper.toDto(saved));
    }

    @Override
    @Transactional
    public Optional<CompetitionTimetableEventDto> update(UUID uuid, CompetitionTimetableEventRequest request) {
        Competition competition = loadCompetition(request.getCompetitionId());
        validateScheduledAt(request.getScheduledAt(), competition);

        CompetitionTimetableEvent existing = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Competition timetable event", uuid));

        CompetitionTimetableEventMapper.updateFromRequest(existing, request);
        CompetitionTimetableEvent saved = repository.save(existing);
        return Optional.of(CompetitionTimetableEventMapper.toDto(saved));
    }

    @Override
    @Transactional
    public void delete(UUID uuid) {
        CompetitionTimetableEvent entity = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Competition timetable event", uuid));
        try {
            repository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(ConstraintViolationMessageExtractor.extractMessage(e));
        }
    }

    private Competition loadCompetition(UUID competitionId) {
        return competitionRepository.findById(competitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Competition", competitionId));
    }

    private void validateScheduledAt(OffsetDateTime scheduledAt, Competition competition) {
        if (!DRAFT_STATUS.equals(competition.getStatus()) && !competition.isTemplate()) {
            if (scheduledAt == null) {
                throw new ValidationException("scheduledAt is required when competition status is not DRAFT");
            }
        }
    }
}
