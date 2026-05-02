package com.bfg.platform.competition.service;

import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.competition.entity.CompetitionParticipation;
import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
import com.bfg.platform.competition.mapper.CompetitionTimetableEventMapper;
import com.bfg.platform.competition.query.CompetitionTimetableEventQueryAdapter;
import com.bfg.platform.competition.repository.CompetitionParticipationRepository;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.CompetitionTimetableEventRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationErrorsException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.query.EnhancedFilterExpressionParser;
import com.bfg.platform.common.query.EnhancedSortParser;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.repository.DynamicEntityGraph;
import com.bfg.platform.gen.model.CompetitionEventStatus;
import com.bfg.platform.gen.model.CompetitionTimetableEventDto;
import com.bfg.platform.gen.model.CompetitionTimetableEventRequest;
import com.bfg.platform.gen.model.CompetitionType;
import com.bfg.platform.gen.model.QualificationEventType;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@AllArgsConstructor
public class CompetitionTimetableEventServiceImpl implements CompetitionTimetableEventService {

    private final CompetitionTimetableEventRepository repository;
    private final CompetitionRepository competitionRepository;
    private final CompetitionParticipationRepository participationRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<CompetitionTimetableEventDto> getAll(String filter, List<String> orderBy, Integer top, Integer skip, List<String> expand) {
        Set<String> requestedExpand = ExpandQueryParser.parse(expand, CompetitionTimetableEvent.class);

        EnhancedFilterExpressionParser.ParseResult<CompetitionTimetableEvent> filterResult =
                CompetitionTimetableEventQueryAdapter.parseFilter(filter, null);
        Specification<CompetitionTimetableEvent> spec = filterResult.getSpecification();

        EnhancedSortParser.ParseResult sortResult = CompetitionTimetableEventQueryAdapter.parseSort(orderBy, null);
        Sort sort = sortResult.getSort();
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, sort);

        Page<CompetitionTimetableEvent> page;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<CompetitionTimetableEvent> entityGraph =
                    DynamicEntityGraph.create(entityManager, CompetitionTimetableEvent.class, requestedExpand);
            page = findAllWithEntityGraph(spec, pageable, entityGraph);
        } else {
            page = repository.findAll(spec, pageable);
        }

        return page.map(e -> CompetitionTimetableEventMapper.toDto(e, requestedExpand));
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
        validateForCompetitionType(competition.getCompetitionType(),
                request.getQualificationEventType());
        if (request.getEventStatus() != CompetitionEventStatus.SCHEDULED) {
            throw new ValidationException("Event status must be SCHEDULED on creation");
        }

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
        validateForCompetitionType(competition.getCompetitionType(),
                request.getQualificationEventType());

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

    @Override
    @Transactional
    public CompetitionTimetableEventDto updateEventStatus(UUID uuid, CompetitionEventStatus newStatus) {
        if (newStatus != CompetitionEventStatus.SCHEDULED
                && newStatus != CompetitionEventStatus.IN_PROGRESS
                && newStatus != CompetitionEventStatus.CANCELLED) {
            throw new ValidationException("Този endpoint поддържа само SCHEDULED, IN_PROGRESS или CANCELLED. " +
                    "За резултатен статус използвайте записване на резултати.");
        }

        CompetitionTimetableEvent event = repository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Competition timetable event", uuid));

        CompetitionEventStatus currentStatus = event.getEventStatus();
        validateEventStatusTransition(currentStatus, newStatus, event);

        event.setEventStatus(newStatus);
        CompetitionTimetableEvent saved = repository.save(event);
        return CompetitionTimetableEventMapper.toDto(saved);
    }

    private static final Map<CompetitionEventStatus, Set<CompetitionEventStatus>> ALLOWED_EVENT_TRANSITIONS = Map.of(
            CompetitionEventStatus.SCHEDULED, Set.of(CompetitionEventStatus.IN_PROGRESS, CompetitionEventStatus.CANCELLED),
            CompetitionEventStatus.IN_PROGRESS, Set.of(CompetitionEventStatus.SCHEDULED, CompetitionEventStatus.CANCELLED),
            CompetitionEventStatus.UNOFFICIAL_RESULTS, Set.of(),
            CompetitionEventStatus.OFFICIAL_RESULTS, Set.of(),
            CompetitionEventStatus.CANCELLED, Set.of(CompetitionEventStatus.SCHEDULED)
    );

    private void validateEventStatusTransition(CompetitionEventStatus current, CompetitionEventStatus target, CompetitionTimetableEvent event) {
        Set<CompetitionEventStatus> allowed = ALLOWED_EVENT_TRANSITIONS.getOrDefault(current, Set.of());
        if (!allowed.contains(target)) {
            throw new ValidationErrorsException(List.of(
                    "Невалиден преход: " + current.getValue() + " → " + target.getValue()));
        }

        if (target == CompetitionEventStatus.SCHEDULED && current == CompetitionEventStatus.IN_PROGRESS) {
            List<CompetitionParticipation> participations = participationRepository
                    .findByCompetitionEventIdOrderByLaneAsc(event.getId());
            boolean hasResults = participations.stream().anyMatch(p -> p.getFinishTimeMs() != null);
            if (hasResults) {
                throw new ValidationErrorsException(List.of(
                        "Не може да се върне към SCHEDULED — вече има записани резултати"));
            }
        }
    }

    private Competition loadCompetition(UUID competitionId) {
        return competitionRepository.findById(competitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Competition", competitionId));
    }

    private void validateScheduledAt(OffsetDateTime scheduledAt, Competition competition) {
        if (scheduledAt == null) {
            throw new ValidationException("scheduledAt is required");
        }
        LocalDate startDate = competition.getStartDate();
        LocalDate endDate = competition.getEndDate();
        if (startDate != null && endDate != null) {
            Instant start = startDate.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant end = endDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant at = scheduledAt.toInstant();
            if (at.isBefore(start) || !at.isBefore(end)) {
                throw new ValidationException("scheduledAt must be within the competition period ("
                        + startDate + " to " + endDate + ")");
            }
        }
    }

    private void validateForCompetitionType(CompetitionType competitionType, QualificationEventType eventType) {
        if (competitionType == null || CompetitionType.NATIONAL_WATER.equals(competitionType)
                || CompetitionType.BALKAN.equals(competitionType)) {
            return;
        }
        if (CompetitionType.ERG.equals(competitionType)) {
            if (eventType != QualificationEventType.H) {
                throw new ValidationException("Only H (heat) events are valid for competition type " + competitionType);
            }
        }
    }

    private Page<CompetitionTimetableEvent> findAllWithEntityGraph(
            Specification<CompetitionTimetableEvent> spec,
            Pageable pageable,
            EntityGraph<CompetitionTimetableEvent> entityGraph) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<CompetitionTimetableEvent> query = cb.createQuery(CompetitionTimetableEvent.class);
        Root<CompetitionTimetableEvent> root = query.from(CompetitionTimetableEvent.class);

        Predicate predicate = spec != null ? spec.toPredicate(root, query, cb) : cb.conjunction();
        if (predicate != null) {
            query.where(predicate);
        }

        if (pageable.getSort().isSorted()) {
            List<jakarta.persistence.criteria.Order> orders = new java.util.ArrayList<>();
            pageable.getSort().forEach(order -> {
                jakarta.persistence.criteria.Path<?> path = root.get(order.getProperty());
                orders.add(order.isAscending() ? cb.asc(path) : cb.desc(path));
            });
            query.orderBy(orders);
        }

        TypedQuery<CompetitionTimetableEvent> typedQuery = entityManager.createQuery(query);
        if (entityGraph != null) {
            typedQuery.setHint("jakarta.persistence.loadgraph", entityGraph);
        }
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<CompetitionTimetableEvent> content = typedQuery.getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<CompetitionTimetableEvent> countRoot = countQuery.from(CompetitionTimetableEvent.class);
        Predicate countPredicate = spec != null ? spec.toPredicate(countRoot, countQuery, cb) : cb.conjunction();
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }
        countQuery.select(cb.count(countRoot));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        return new PageImpl<>(content, pageable, total);
    }
}
