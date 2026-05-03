package com.bfg.platform.competition.service;

import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.common.storage.S3Service;
import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.competition.entity.CompetitionFinalStanding;
import com.bfg.platform.competition.entity.CompetitionGroupDefinition;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.competition.entity.Entry;
import com.bfg.platform.competition.repository.CompetitionFinalStandingRepository;
import com.bfg.platform.competition.repository.CompetitionGroupDefinitionRepository;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.DisciplineDefinitionRepository;
import com.bfg.platform.competition.repository.EntryRepository;
import com.bfg.platform.gen.model.ClubRankingCompetitionDto;
import com.bfg.platform.gen.model.ClubRankingDisciplineDto;
import com.bfg.platform.gen.model.ClubRankingDto;
import com.bfg.platform.gen.model.ClubRankingsResponse;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class ClubRankingServiceImpl implements ClubRankingService {

    private final CompetitionFinalStandingRepository standingRepository;
    private final EntryRepository entryRepository;
    private final ClubRepository clubRepository;
    private final CompetitionRepository competitionRepository;
    private final DisciplineDefinitionRepository disciplineDefinitionRepository;
    private final CompetitionGroupDefinitionRepository competitionGroupDefinitionRepository;
    private final S3Service s3Service;

    @Override
    @Transactional(readOnly = true)
    public ClubRankingsResponse computeClubRankings(List<UUID> competitionIds) {
        List<CompetitionFinalStanding> allStandings = standingRepository.findByCompetitionIdIn(competitionIds);

        if (allStandings.isEmpty()) {
            ClubRankingsResponse response = new ClubRankingsResponse();
            response.setRankings(List.of());
            return response;
        }

        Set<UUID> entryIds = allStandings.stream()
                .map(CompetitionFinalStanding::getEntryId)
                .collect(Collectors.toSet());
        Map<UUID, Entry> entriesById = entryRepository.findAllById(entryIds).stream()
                .collect(Collectors.toMap(Entry::getId, Function.identity()));

        Set<UUID> clubIds = entriesById.values().stream()
                .map(Entry::getClubId)
                .collect(Collectors.toSet());
        Map<UUID, Club> clubsById = clubRepository.findAllById(clubIds).stream()
                .collect(Collectors.toMap(Club::getId, Function.identity()));

        Set<UUID> competitionIdSet = allStandings.stream()
                .map(CompetitionFinalStanding::getCompetitionId)
                .collect(Collectors.toSet());
        Map<UUID, Competition> competitionsById = competitionRepository.findAllById(competitionIdSet).stream()
                .collect(Collectors.toMap(Competition::getId, Function.identity()));

        Set<UUID> disciplineIds = allStandings.stream()
                .map(CompetitionFinalStanding::getDisciplineId)
                .collect(Collectors.toSet());
        Map<UUID, DisciplineDefinition> disciplinesById = disciplineDefinitionRepository.findAllById(disciplineIds).stream()
                .collect(Collectors.toMap(DisciplineDefinition::getId, Function.identity()));

        Set<UUID> groupIds = disciplinesById.values().stream()
                .map(DisciplineDefinition::getCompetitionGroupId)
                .filter(g -> g != null)
                .collect(Collectors.toSet());
        Map<UUID, CompetitionGroupDefinition> groupsById = competitionGroupDefinitionRepository.findAllById(groupIds).stream()
                .collect(Collectors.toMap(CompetitionGroupDefinition::getId, Function.identity()));

        // Group: clubId → competitionId → disciplineId → list of standings
        Map<UUID, Map<UUID, Map<UUID, List<CompetitionFinalStanding>>>> grouped = new HashMap<>();

        for (CompetitionFinalStanding standing : allStandings) {
            Entry entry = entriesById.get(standing.getEntryId());
            if (entry == null) continue;
            UUID clubId = entry.getClubId();

            grouped.computeIfAbsent(clubId, k -> new HashMap<>())
                    .computeIfAbsent(standing.getCompetitionId(), k -> new HashMap<>())
                    .computeIfAbsent(standing.getDisciplineId(), k -> new ArrayList<>())
                    .add(standing);
        }

        // Build club DTOs
        List<ClubRankingDto> rankings = new ArrayList<>();

        for (Map.Entry<UUID, Map<UUID, Map<UUID, List<CompetitionFinalStanding>>>> clubEntry : grouped.entrySet()) {
            UUID clubId = clubEntry.getKey();
            Map<UUID, Map<UUID, List<CompetitionFinalStanding>>> compMap = clubEntry.getValue();

            List<ClubRankingCompetitionDto> competitionDtos = new ArrayList<>();

            for (Map.Entry<UUID, Map<UUID, List<CompetitionFinalStanding>>> compEntry : compMap.entrySet()) {
                UUID compId = compEntry.getKey();
                Map<UUID, List<CompetitionFinalStanding>> discMap = compEntry.getValue();

                double compPoints = 0;
                List<ClubRankingDisciplineDto> disciplineDtos = new ArrayList<>();

                for (Map.Entry<UUID, List<CompetitionFinalStanding>> discEntry : discMap.entrySet()) {
                    UUID discId = discEntry.getKey();
                    List<CompetitionFinalStanding> standings = discEntry.getValue();

                    double discPoints = standings.stream()
                            .map(CompetitionFinalStanding::getPoints)
                            .filter(p -> p != null)
                            .mapToDouble(BigDecimal::doubleValue)
                            .sum();

                    Integer bestRank = standings.stream()
                            .map(CompetitionFinalStanding::getOverallRank)
                            .filter(r -> r != null)
                            .min(Integer::compareTo)
                            .orElse(null);

                    DisciplineDefinition disc = disciplinesById.get(discId);
                    ClubRankingDisciplineDto discDto = new ClubRankingDisciplineDto();
                    discDto.setDisciplineId(discId);
                    discDto.setDisciplineShortName(disc != null ? disc.getShortName() : null);
                    if (disc != null) {
                        discDto.setCompetitionGroupId(disc.getCompetitionGroupId());
                        CompetitionGroupDefinition group = groupsById.get(disc.getCompetitionGroupId());
                        discDto.setCompetitionGroupShortName(group != null ? group.getShortName() : null);
                        discDto.setGender(disc.getGender());
                    }
                    discDto.setPoints(discPoints);
                    discDto.setRank(bestRank);
                    disciplineDtos.add(discDto);

                    compPoints += discPoints;
                }

                Competition comp = competitionsById.get(compId);
                ClubRankingCompetitionDto compDto = new ClubRankingCompetitionDto();
                compDto.setCompetitionId(compId);
                compDto.setCompetitionName(comp != null ? comp.getShortName() : null);
                compDto.setCompetitionPoints(compPoints);
                compDto.setDisciplines(disciplineDtos);
                competitionDtos.add(compDto);
            }

            Club club = clubsById.get(clubId);
            ClubRankingDto dto = new ClubRankingDto();
            dto.setClubId(clubId);
            dto.setClubName(club != null ? club.getName() : null);
            dto.setClubShortName(club != null ? club.getShortName() : null);
            dto.setClubLogoUrl(club != null ? resolveLogoUrl(club.getLogoUrl()) : null);
            dto.setCompetitions(competitionDtos);
            rankings.add(dto);
        }

        ClubRankingsResponse response = new ClubRankingsResponse();
        response.setRankings(rankings);
        return response;
    }

    private String resolveLogoUrl(String logoPath) {
        if (logoPath == null || logoPath.isBlank()) return null;
        return parseBucketAndObject(logoPath)
                .map(pair -> s3Service.getPresignedUrl(pair.bucket(), pair.objectName(), 3600))
                .filter(url -> url != null && !url.isBlank())
                .orElse(null);
    }

    private Optional<BucketObject> parseBucketAndObject(String path) {
        String cleanPath = path.startsWith("/") ? path.substring(1) : path;
        String[] parts = cleanPath.split("/", 2);
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) return Optional.empty();
        return Optional.of(new BucketObject(parts[0], parts[1]));
    }

    private record BucketObject(String bucket, String objectName) {}
}
