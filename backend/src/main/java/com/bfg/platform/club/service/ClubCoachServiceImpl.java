package com.bfg.platform.club.service;

import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.club.mapper.ClubCoachMapper;
import com.bfg.platform.club.mapper.ClubMapper;
import com.bfg.platform.club.query.ClubCoachQueryAdapter;
import com.bfg.platform.club.repository.ClubCoachRepository;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ForbiddenException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.exception.ValidationException;
import com.bfg.platform.common.i18n.MessageResolver;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.repository.DynamicEntityGraph;
import com.bfg.platform.common.security.AuthorizationService;
import com.bfg.platform.common.security.SecurityContextHelper;
import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCoachDto;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.ScopeType;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.user.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@AllArgsConstructor
public class ClubCoachServiceImpl implements ClubCoachService {

    private final ClubCoachRepository clubCoachRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;
    private final SecurityContextHelper securityContextHelper;
    private final AuthorizationService authorizationService;
    private final MessageResolver messageResolver;

    @Override
    public Page<ClubCoachDto> getCoachesByClubId(UUID clubId, String filter, List<String> orderBy, Integer top, Integer skip, List<String> expand) {
        clubRepository.findById(clubId)
                .orElseThrow(() -> new ResourceNotFoundException("Club", clubId));

        Set<String> requestedExpand = ExpandQueryParser.parse(expand, ClubCoach.class);

        Pageable pageable = OffsetBasedPageRequest.of(skip, top, ClubCoachQueryAdapter.parseSort(orderBy));
        Specification<ClubCoach> spec = Specification
                .where(ClubCoachQueryAdapter.parseFilter(filter))
                .and((root, query, cb) -> cb.equal(root.get("clubId"), clubId));

        Page<ClubCoach> page;
        if (!requestedExpand.isEmpty()) {
            EntityGraph<ClubCoach> entityGraph =
                    DynamicEntityGraph.create(entityManager, ClubCoach.class, requestedExpand);
            page = findAllWithEntityGraph(spec, pageable, entityGraph);
        } else {
            page = clubCoachRepository.findAll(spec, pageable);
        }

        return page.map(clubCoach -> ClubCoachMapper.toDto(clubCoach, requestedExpand));
    }

    @Override
    public Optional<ClubDto> getClubByCoachId(UUID coachId, List<String> expand) {
        java.util.Set<String> requestedExpand = ExpandQueryParser.parse(expand, Club.class);
        
        return clubCoachRepository.findByCoachId(coachId)
                .map(ClubCoach::getClubId)
                .flatMap(clubRepository::findById)
                .map(club -> ClubMapper.toDto(club, requestedExpand));
    }

    @Override
    @Transactional
    public Optional<ClubCoachDto> assignCoachToClub(ClubCoachCreateRequest request) {
        validateAssignPermissions(request);

        Club club = clubRepository.findById(request.getClubId())
                .orElseThrow(() -> new ResourceNotFoundException("Club", request.getClubId()));

        if (!club.isActive()) {
            throw new ValidationException(messageResolver.resolve("club.cannotAssignCoachToInactive"));
        }

        validateCoachRole(request.getCoachId());

        ClubCoach clubCoach = ClubCoachMapper.fromCreateRequest(request);

        ClubCoach saved = clubCoachRepository.save(clubCoach);
        return Optional.of(ClubCoachMapper.toDto(saved));
    }

    @Override
    @Transactional
    public void removeCoachFromClub(UUID clubCoachId) {
        ClubCoach clubCoach = clubCoachRepository.findById(clubCoachId)
                .orElseThrow(() -> new ResourceNotFoundException("ClubCoach", clubCoachId));

        validateRemovePermissions(clubCoach);

        try {
            clubCoachRepository.delete(clubCoach);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(messageResolver.resolve("club.coachRemoveFailed"));
        }
    }

    private void validateCoachRole(UUID coachId) {
        if (!userRepository.isCoach(coachId)) {
            throw new ValidationException(messageResolver.resolve("club.userNotCoach"));
        }
    }


    private void validateAssignPermissions(ClubCoachCreateRequest request) {
        SystemRole currentRole = securityContextHelper.getUserRole();
        if (currentRole == null) {
            throw new ForbiddenException(messageResolver.resolve("user.roleNotAvailable"));
        }

        switch (currentRole) {
            case APP_ADMIN, FEDERATION_ADMIN -> {
                // Admins can always assign coaches
            }
            case CLUB_ADMIN -> {
                UUID currentUserId = securityContextHelper.getUserId();
                Club club = clubRepository.findByClubAdmin(currentUserId)
                        .orElseThrow(() -> new ForbiddenException(messageResolver.resolve("permission.clubAdminNotAssociated")));
                if (!request.getClubId().equals(club.getId())) {
                    throw new ForbiddenException(messageResolver.resolve("permission.clubAdminOwnClubOnly"));
                }
            }
            default -> throw new ForbiddenException(messageResolver.resolve("permission.coachAssignForbidden"));
        }
    }

    private void validateRemovePermissions(ClubCoach clubCoach) {
        SystemRole currentRole = securityContextHelper.getUserRole();
        if (currentRole == null) {
            throw new ForbiddenException(messageResolver.resolve("user.roleNotAvailable"));
        }

        switch (currentRole) {
            case APP_ADMIN, FEDERATION_ADMIN -> {
                // Admins can always remove coaches
            }
            case CLUB_ADMIN -> {
                UUID currentUserId = securityContextHelper.getUserId();
                Club club = clubRepository.findByClubAdmin(currentUserId)
                        .orElseThrow(() -> new ForbiddenException(messageResolver.resolve("permission.clubAdminNotAssociated")));
                if (!clubCoach.getClubId().equals(club.getId())) {
                    throw new ForbiddenException(messageResolver.resolve("permission.clubAdminOwnClubOnly"));
                }
            }
            default -> throw new ForbiddenException(messageResolver.resolve("permission.coachRemoveForbidden"));
        }
    }

    private Page<ClubCoach> findAllWithEntityGraph(
            Specification<ClubCoach> spec, Pageable pageable, EntityGraph<ClubCoach> entityGraph) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<ClubCoach> query = cb.createQuery(ClubCoach.class);
        Root<ClubCoach> root = query.from(ClubCoach.class);

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

        TypedQuery<ClubCoach> typedQuery = entityManager.createQuery(query);
        if (entityGraph != null) {
            typedQuery.setHint("jakarta.persistence.loadgraph", entityGraph);
        }
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<ClubCoach> content = typedQuery.getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<ClubCoach> countRoot = countQuery.from(ClubCoach.class);
        Predicate countPredicate = spec != null ? spec.toPredicate(countRoot, countQuery, cb) : cb.conjunction();
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }
        countQuery.select(cb.count(countRoot));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        return new PageImpl<>(content, pageable, total);
    }
}

