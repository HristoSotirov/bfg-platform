package com.bfg.platform.bootstrap;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.repository.AccreditationRepository;
import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.club.repository.ClubCoachRepository;
import com.bfg.platform.club.service.ClubCoachService;
import com.bfg.platform.club.service.ClubService;
import com.bfg.platform.competition.entity.Competition;
import com.bfg.platform.competition.entity.CompetitionDisciplineScheme;
import com.bfg.platform.competition.entity.CompetitionGroupDefinition;
import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.competition.entity.QualificationScheme;
import com.bfg.platform.competition.entity.ScoringScheme;
import com.bfg.platform.competition.repository.CompetitionDisciplineSchemeRepository;
import com.bfg.platform.competition.repository.CompetitionGroupDefinitionRepository;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.CompetitionTimetableEventRepository;
import com.bfg.platform.competition.repository.DisciplineDefinitionRepository;
import com.bfg.platform.competition.repository.QualificationSchemeRepository;
import com.bfg.platform.competition.repository.ScoringSchemeRepository;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.BoatClass;
import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCreateRequest;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.CompetitionGroupGender;
import com.bfg.platform.gen.model.Gender;
import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.ScoringType;
import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.gen.model.UserCreateRequest;
import com.bfg.platform.gen.model.UserDto;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.repository.UserRepository;
import com.bfg.platform.user.service.UserMapper;
import com.bfg.platform.user.service.UserService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@AllArgsConstructor
@Slf4j
public class TestDataBootstrapRunner implements CommandLineRunner {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ClubService clubService;
    private final ClubCoachService clubCoachService;
    private final ClubCoachRepository clubCoachRepository;
    private final AthleteRepository athleteRepository;
    private final AccreditationRepository accreditationRepository;
    private final Environment environment;
    private final ScoringSchemeRepository scoringSchemeRepository;
    private final QualificationSchemeRepository qualificationSchemeRepository;
    private final CompetitionGroupDefinitionRepository competitionGroupDefinitionRepository;
    private final DisciplineDefinitionRepository disciplineDefinitionRepository;
    private final CompetitionRepository competitionRepository;
    private final CompetitionDisciplineSchemeRepository competitionDisciplineSchemeRepository;
    private final CompetitionTimetableEventRepository competitionTimetableEventRepository;

    @Override
    public void run(String... args) {
        List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());
        boolean enabled = activeProfiles.contains("local") || activeProfiles.contains("test") ||
                Boolean.parseBoolean(environment.getProperty("bfg.test-data.enabled", "false"));
        
        if (!enabled) {
            return;
        }

        if (!clubService.getAllClubs(null, null, null, 1, 0, null).isEmpty() &&
            !athleteRepository.findAll().isEmpty()) {
            return;
        }

        runWithBootstrapContext();
    }

    private void runWithBootstrapContext() {
        SecurityContext previousContext = SecurityContextHolder.getContext();
        try {
            UsernamePasswordAuthenticationToken bootstrapAuth = new UsernamePasswordAuthenticationToken(
                    UUID.randomUUID(),
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority(SystemRole.APP_ADMIN.getValue()))
            );
            bootstrapAuth.setDetails(Map.of("scopeType", ScopeType.INTERNAL));
            SecurityContextHolder.getContext().setAuthentication(bootstrapAuth);
            doRun();
        } finally {
            SecurityContextHolder.setContext(previousContext);
        }
    }

    private void doRun() {

        createUser("admin@example.com", "admin123", "App", "Admin", SystemRole.APP_ADMIN, LocalDate.of(1985, 1, 10), ScopeType.INTERNAL);
        createUser("admin-national@example.com", "admin123", "App", "Admin National", SystemRole.APP_ADMIN, LocalDate.of(1984, 2, 15), ScopeType.NATIONAL);
        createUser("admin-external@example.com", "admin123", "App", "Admin External", SystemRole.APP_ADMIN, LocalDate.of(1986, 8, 20), ScopeType.EXTERNAL);
        createUser("fedadmin@example.com", "fed123", "Federation", "Admin", SystemRole.FEDERATION_ADMIN, LocalDate.of(1987, 6, 5), ScopeType.INTERNAL);
        createUser("fedadmin-national@example.com", "fed123", "Federation", "Admin National", SystemRole.FEDERATION_ADMIN, LocalDate.of(1988, 3, 12), ScopeType.NATIONAL);
        
        UserDto clubAdmin1 = createUser("clubadmin1@example.com", "club123", "Иван", "Петров", SystemRole.CLUB_ADMIN, LocalDate.of(1990, 3, 12), ScopeType.INTERNAL);
        UserDto clubAdmin2 = createUser("clubadmin2@example.com", "club123", "Георги", "Иванов", SystemRole.CLUB_ADMIN, LocalDate.of(1991, 9, 20), ScopeType.INTERNAL);
        UserDto clubAdmin3 = createUser("clubadmin3@example.com", "club123", "Петър", "Георгиев", SystemRole.CLUB_ADMIN, LocalDate.of(1992, 5, 15), ScopeType.INTERNAL);
        UserDto clubAdmin4 = createUser("clubadmin4@example.com", "club123", "Иван", "Петрое", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25), ScopeType.INTERNAL);
        createUser("clubadmin5@example.com", "club123", "Петър", "Димитров", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25), ScopeType.INTERNAL);
        createUser("clubadmin6@example.com", "club123", "Мартин", "Георгиев", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25), ScopeType.INTERNAL);
        createUser("clubadmin7@example.com", "club123", "Георги", "Димитров", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25), ScopeType.INTERNAL);
        createUser("clubadmin8@example.com", "club123", "Димитър", "Димитров", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25), ScopeType.INTERNAL);
        createUser("clubadmin9@example.com", "club123", "Ники", "Димитров", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25), ScopeType.INTERNAL);

        UserDto nationalClubAdmin1 = createUser("fedclubadmin1@example.com", "fedclub123", "Стефан", "Федеров", SystemRole.CLUB_ADMIN, LocalDate.of(1985, 4, 1), ScopeType.NATIONAL);
        UserDto nationalClubAdmin2 = createUser("fedclubadmin2@example.com", "fedclub123", "Катерина", "Федерова", SystemRole.CLUB_ADMIN, LocalDate.of(1989, 8, 12), ScopeType.NATIONAL);
        UserDto nationalClubAdmin3 = createUser("fedclubadmin3@example.com", "fedclub123", "Васил", "Националов", SystemRole.CLUB_ADMIN, LocalDate.of(1986, 1, 22), ScopeType.NATIONAL);

        UserDto coach1 = createUser("coach1@example.com", "coach123", "Мария", "Николова", SystemRole.COACH, LocalDate.of(1994, 2, 8), ScopeType.INTERNAL);
        UserDto coach2 = createUser("coach2@example.com", "coach123", "Елена", "Стоянова", SystemRole.COACH, LocalDate.of(1996, 11, 4), ScopeType.INTERNAL);
        UserDto coach3 = createUser("coach3@example.com", "coach123", "Стоян", "Василев", SystemRole.COACH, LocalDate.of(1993, 4, 18), ScopeType.NATIONAL);

        ClubDto club1 = createClub("Гребен клуб София", "ГКС", clubAdmin1.getUuid(), "gks@example.com", ScopeType.INTERNAL);
        ClubDto club2 = createClub("Гребен клуб Варна", "ГКВ", clubAdmin2.getUuid(), "gkv@example.com", ScopeType.INTERNAL);
        ClubDto club3 = createClub("Гребен клуб Пловдив", "ГКП", clubAdmin3.getUuid(), "gkp@example.com", ScopeType.INTERNAL);
        ClubDto club4 = createClub("Гребен клуб Русе", "ГКР", clubAdmin4.getUuid(), "gkr@example.com", ScopeType.INTERNAL);

        ClubDto nationalClub1 = createClub("Федерация Гребене София", "ФГС", nationalClubAdmin1.getUuid(), "fgs@example.com", ScopeType.NATIONAL);
        ClubDto nationalClub2 = createClub("Федерация Гребене Пловдив", "ФГП", nationalClubAdmin2.getUuid(), "fgp@example.com", ScopeType.NATIONAL);
        ClubDto nationalClub3 = createClub("Федерация Гребене Варна", "ФГВ", nationalClubAdmin3.getUuid(), "fgv@example.com", ScopeType.NATIONAL);

        UserDto externalClubAdmin = createUser("externaladmin@example.com", "ext123", "Външен", "Админ", SystemRole.CLUB_ADMIN, LocalDate.of(1982, 11, 8), ScopeType.EXTERNAL);
        ClubDto externalClub = createClub("Външен клуб Партньор", "ВКП", externalClubAdmin.getUuid(), "vkp@example.com", ScopeType.EXTERNAL);
        UserDto externalClubAdmin2 = createUser("externaladmin2@example.com", "ext123", "Външен", "Партньор 2", SystemRole.CLUB_ADMIN, LocalDate.of(1983, 4, 14), ScopeType.EXTERNAL);
        ClubDto externalClub2 = createClub("Външен клуб Гребене", "ВКГ", externalClubAdmin2.getUuid(), "vkg@example.com", ScopeType.EXTERNAL);
        UserDto coachExternal = createUser("coach-ext@example.com", "coach123", "Костадин", "Външен", SystemRole.COACH, LocalDate.of(1990, 5, 3), ScopeType.EXTERNAL);
        createUser("externaladmin3@example.com", "ext123", "Външен", "Партньор 2", SystemRole.CLUB_ADMIN, LocalDate.of(1983, 4, 14), ScopeType.EXTERNAL);

        assignCoachToClub(coachExternal.getUuid(), externalClub.getUuid(), ScopeType.EXTERNAL);

        assignCoachToClub(coach1.getUuid(), club1.getUuid(), ScopeType.INTERNAL);
        assignCoachToClub(coach2.getUuid(), club2.getUuid(), ScopeType.INTERNAL);
        assignCoachToClub(coach3.getUuid(), nationalClub1.getUuid(), ScopeType.NATIONAL);

        Athlete athlete1 = createAthlete("Ivan", "Petrov", "Ivanov", Gender.MALE, LocalDate.of(1995, 5, 15));
        Athlete athlete2 = createAthlete("Maria", "", "Georgieva", Gender.FEMALE, LocalDate.of(1998, 8, 20));
        Athlete athlete3 = createAthlete("Petar", "Ivanov", "Petrov", Gender.MALE, LocalDate.of(1992, 3, 10));
        Athlete athlete4 = createAthlete("Anna", "Georgieva", "Ivanova", Gender.FEMALE, LocalDate.of(1996, 11, 5));
        
        Athlete athlete5 = createAthlete("Dimitar", "", "Dimitrov", Gender.MALE, LocalDate.of(1994, 7, 25));
        Athlete athlete6 = createAthlete("Elena", "Petrova", "Georgieva", Gender.FEMALE, LocalDate.of(1999, 2, 14));
        Athlete athlete7 = createAthlete("Nikolay", "Ivanov", "Nikolov", Gender.MALE, LocalDate.of(1991, 9, 30));
        
        Athlete athlete8 = createAthlete("Svetlana", "", "Svetlova", Gender.FEMALE, LocalDate.of(1997, 4, 18));
        Athlete athlete9 = createAthlete("Georgi", "Petrov", "Georgiev", Gender.MALE, LocalDate.of(1993, 12, 8));
        Athlete athlete10 = createAthlete("Tsvetana", "Ivanova", "Tsvetanova", Gender.FEMALE, LocalDate.of(2000, 6, 22));

        int currentYear = LocalDate.now().getYear();
        int previousYear = currentYear - 1;
        
        createAccreditation(athlete1.getId(), club1.getUuid(), club1.getCardPrefix(), 2012, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getUuid(), club1.getCardPrefix(), 2013, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getUuid(), club1.getCardPrefix(), 2014, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getUuid(), club1.getCardPrefix(), 2015, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getUuid(), club1.getCardPrefix(), 2016, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getUuid(), club1.getCardPrefix(), 2017, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club2.getUuid(), club2.getCardPrefix(), 2018, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club2.getUuid(), club2.getCardPrefix(), 2019, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club2.getUuid(), club2.getCardPrefix(), 2020, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club2.getUuid(), club2.getCardPrefix(), 2021, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club3.getUuid(), club3.getCardPrefix(), 2022, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club3.getUuid(), club3.getCardPrefix(), 2023, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club3.getUuid(), club3.getCardPrefix(), 2024, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getUuid(), club1.getCardPrefix(), 2025, AccreditationStatus.NEW_PHOTO_REQUIRED);
        createAccreditation(athlete1.getId(), club1.getUuid(), club1.getCardPrefix(), 2026, AccreditationStatus.ACTIVE);
        
        createAccreditation(athlete2.getId(), club1.getUuid(), club1.getCardPrefix(), 2023, AccreditationStatus.EXPIRED);
        createAccreditation(athlete2.getId(), club1.getUuid(), club1.getCardPrefix(), 2024, AccreditationStatus.EXPIRED);
        createAccreditation(athlete2.getId(), club1.getUuid(), club1.getCardPrefix(), 2025, AccreditationStatus.EXPIRED);
        createAccreditation(athlete2.getId(), club2.getUuid(), club2.getCardPrefix(), currentYear, AccreditationStatus.PENDING_VALIDATION);
        
        createAccreditation(athlete3.getId(), club1.getUuid(), club1.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete4.getId(), club1.getUuid(), club1.getCardPrefix(), currentYear, AccreditationStatus.NEW_PHOTO_REQUIRED);
        
        createAccreditation(athlete5.getId(), club2.getUuid(), club2.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED);
        createAccreditation(athlete5.getId(), club2.getUuid(), club2.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete6.getId(), club2.getUuid(), club2.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete7.getId(), club2.getUuid(), club2.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED);
        createAccreditation(athlete7.getId(), club2.getUuid(), club2.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE);
        
        createAccreditation(athlete8.getId(), club3.getUuid(), club3.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete9.getId(), club3.getUuid(), club3.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED);
        createAccreditation(athlete9.getId(), club3.getUuid(), club3.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete10.getId(), club3.getUuid(), club3.getCardPrefix(), currentYear, AccreditationStatus.PENDING_VALIDATION);

        // club4 (INTERNAL) – още състезатели и картотеки за тест
        Athlete athlete11 = createAthlete("Калин", "Петров", "Русенски", Gender.MALE, LocalDate.of(1995, 2, 28));
        Athlete athlete12 = createAthlete("Симона", "", "Русенска", Gender.FEMALE, LocalDate.of(1998, 10, 12));
        createAccreditation(athlete11.getId(), club4.getUuid(), club4.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED);
        createAccreditation(athlete11.getId(), club4.getUuid(), club4.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete12.getId(), club4.getUuid(), club4.getCardPrefix(), currentYear, AccreditationStatus.NEW_PHOTO_REQUIRED);

        // NATIONAL scope: атлети и акредитации за федерационни клубове
        Athlete nationalAthlete1 = createAthlete("Борис", "Федоров", "Федоров", Gender.MALE, LocalDate.of(1996, 1, 10), ScopeType.NATIONAL);
        Athlete nationalAthlete2 = createAthlete("Десислава", "", "Федерова", Gender.FEMALE, LocalDate.of(1998, 5, 22), ScopeType.NATIONAL);
        Athlete nationalAthlete3 = createAthlete("Кристиян", "Петров", "Федеров", Gender.MALE, LocalDate.of(1995, 9, 7), ScopeType.NATIONAL);
        Athlete nationalAthlete4 = createAthlete("Радка", "Иванова", "Федерова", Gender.FEMALE, LocalDate.of(1999, 3, 15), ScopeType.NATIONAL);

        createAccreditation(nationalAthlete1.getId(), nationalClub1.getUuid(), nationalClub1.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED, ScopeType.NATIONAL);
        createAccreditation(nationalAthlete1.getId(), nationalClub1.getUuid(), nationalClub1.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE, ScopeType.NATIONAL);
        createAccreditation(nationalAthlete2.getId(), nationalClub1.getUuid(), nationalClub1.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE, ScopeType.NATIONAL);
        createAccreditation(nationalAthlete3.getId(), nationalClub1.getUuid(), nationalClub1.getCardPrefix(), currentYear, AccreditationStatus.PENDING_VALIDATION, ScopeType.NATIONAL);
        createAccreditation(nationalAthlete4.getId(), nationalClub2.getUuid(), nationalClub2.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE, ScopeType.NATIONAL);
        createAccreditation(nationalAthlete4.getId(), nationalClub2.getUuid(), nationalClub2.getCardPrefix(), previousYear, AccreditationStatus.NEW_PHOTO_REQUIRED, ScopeType.NATIONAL);

        // nationalClub3 – още национални състезатели и картотеки
        Athlete nationalAthlete5 = createAthlete("Пламен", "Националов", "Федеров", Gender.MALE, LocalDate.of(1997, 6, 8), ScopeType.NATIONAL);
        Athlete nationalAthlete6 = createAthlete("Йоанна", "", "Националова", Gender.FEMALE, LocalDate.of(1999, 12, 1), ScopeType.NATIONAL);
        createAccreditation(nationalAthlete5.getId(), nationalClub3.getUuid(), nationalClub3.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED, ScopeType.NATIONAL);
        createAccreditation(nationalAthlete5.getId(), nationalClub3.getUuid(), nationalClub3.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE, ScopeType.NATIONAL);
        createAccreditation(nationalAthlete6.getId(), nationalClub3.getUuid(), nationalClub3.getCardPrefix(), currentYear, AccreditationStatus.PENDING_VALIDATION, ScopeType.NATIONAL);

        // EXTERNAL scope: клуб, атлети и акредитации за тест
        Athlete externalAthlete1 = createAthlete("Владимир", "Външен", "Външнов", Gender.MALE, LocalDate.of(1994, 4, 11), ScopeType.EXTERNAL);
        Athlete externalAthlete2 = createAthlete("Теодора", "", "Външнова", Gender.FEMALE, LocalDate.of(1997, 7, 29), ScopeType.EXTERNAL);
        createAccreditation(externalAthlete1.getId(), externalClub.getUuid(), externalClub.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED, ScopeType.EXTERNAL);
        createAccreditation(externalAthlete1.getId(), externalClub.getUuid(), externalClub.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE, ScopeType.EXTERNAL);
        createAccreditation(externalAthlete2.getId(), externalClub.getUuid(), externalClub.getCardPrefix(), currentYear, AccreditationStatus.PENDING_VALIDATION, ScopeType.EXTERNAL);

        // externalClub2 – още външни състезатели и картотеки
        Athlete externalAthlete3 = createAthlete("Мартин", "Външен", "Партньоров", Gender.MALE, LocalDate.of(1996, 3, 19), ScopeType.EXTERNAL);
        Athlete externalAthlete4 = createAthlete("Виктория", "", "Външнова", Gender.FEMALE, LocalDate.of(2001, 8, 7), ScopeType.EXTERNAL);
        createAccreditation(externalAthlete3.getId(), externalClub2.getUuid(), externalClub2.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED, ScopeType.EXTERNAL);
        createAccreditation(externalAthlete3.getId(), externalClub2.getUuid(), externalClub2.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE, ScopeType.EXTERNAL);
        createAccreditation(externalAthlete4.getId(), externalClub2.getUuid(), externalClub2.getCardPrefix(), currentYear, AccreditationStatus.NEW_PHOTO_REQUIRED, ScopeType.EXTERNAL);

        bootstrapCompetitionData();
    }

    private UserDto createUser(String username, String password, String firstName, String lastName, SystemRole role, LocalDate dateOfBirth, ScopeType scopeType) {
        if (userRepository.existsByUsername(username)) {
            return UserMapper.toDto(userRepository.findByUsername(username).orElseThrow());
        }

        ScopeType effectiveScope = scopeType != null ? scopeType : ScopeType.INTERNAL;

        User user = User.builder()
                .username(username)
                .email(username)
                .password(passwordEncoder.encode(password))
                .firstName(firstName)
                .lastName(lastName)
                .dateOfBirth(dateOfBirth)
                .role(role)
                .scopeType(effectiveScope)
                .isActive(true)
                .build();
        return UserMapper.toDto(userRepository.save(user));
    }

    private ClubDto createClub(String name, String shortName, UUID clubAdmin, String clubEmail, ScopeType scopeType) {
        ClubCreateRequest request = new ClubCreateRequest();
        request.setName(name);
        request.setShortName(shortName);
        request.setClubAdminId(clubAdmin);
        request.setClubEmail(clubEmail);
        request.setScopeType(scopeType != null ? scopeType : ScopeType.INTERNAL);
        return clubService.createClub(request).orElseThrow();
    }

    private Athlete createAthlete(String firstName, String middleName, String lastName,
                                   Gender gender, LocalDate dateOfBirth) {
        return createAthlete(firstName, middleName, lastName, gender, dateOfBirth, ScopeType.INTERNAL);
    }

    private Athlete createAthlete(String firstName, String middleName, String lastName,
                                   Gender gender, LocalDate dateOfBirth, ScopeType scopeType) {
        Athlete athlete = Athlete.builder()
                .firstName(firstName)
                .middleName(middleName)
                .lastName(lastName)
                .gender(gender)
                .dateOfBirth(dateOfBirth)
                .scopeType(scopeType != null ? scopeType : ScopeType.INTERNAL)
                .medicalExaminationDue(dateOfBirth.plusYears(1))
                .insuranceFrom(LocalDate.now().minusMonths(6))
                .insuranceTo(LocalDate.now().plusMonths(6))
                .build();

        return athleteRepository.save(athlete);
    }

    private void createAccreditation(UUID athleteId, UUID clubId, String clubCardPrefix,
                                     Integer year, AccreditationStatus status) {
        createAccreditation(athleteId, clubId, clubCardPrefix, year, status, ScopeType.INTERNAL);
    }

    private void createAccreditation(UUID athleteId, UUID clubId, String clubCardPrefix,
                                     Integer year, AccreditationStatus status, ScopeType scopeType) {
        String accreditationNumber = accreditationRepository
                .findExistingCardNumberForAthleteAndClub(athleteId, clubId)
                .orElseGet(() -> {
                    String nextNum = accreditationRepository.findNextAthleteNumberForClub(
                            clubId, clubCardPrefix + "%");
                    return clubCardPrefix + nextNum;
                });

        Accreditation accreditation = Accreditation.builder()
                .athleteId(athleteId)
                .clubId(clubId)
                .accreditationNumber(accreditationNumber)
                .year(year)
                .scopeType(scopeType != null ? scopeType : ScopeType.INTERNAL)
                .status(status)
                .build();

        accreditationRepository.save(accreditation);
    }

    private void assignCoachToClub(UUID coachId, UUID clubId, ScopeType clubScopeType) {
        if (clubCoachRepository.existsByClubIdAndCoachId(clubId, coachId)) {
            return;
        }

        if (ScopeType.INTERNAL.equals(clubScopeType)) {
            ClubCoachCreateRequest request = new ClubCoachCreateRequest();
            request.setClubId(clubId);
            request.setCoachId(coachId);
            clubCoachService.assignCoachToClub(request);
            return;
        }

        ClubCoach clubCoach = ClubCoach.builder()
                .coachId(coachId)
                .clubId(clubId)
                .build();
        clubCoachRepository.save(clubCoach);
    }

    private void bootstrapCompetitionData() {
        if (!competitionRepository.findAll().isEmpty()) {
            return;
        }

        // ── Scoring schemes ──────────────────────────────────────────────────
        ScoringScheme scoringScheme = scoringSchemeRepository.save(
                ScoringScheme.builder()
                        .name("Стандартна схема")
                        .scoringType(ScoringType.FIXED)
                        .isActive(true)
                        .build());

        ScoringScheme scoringScheme2 = scoringSchemeRepository.save(
                ScoringScheme.builder()
                        .name("Точкова схема")
                        .scoringType(ScoringType.OFFSET_FROM_END)
                        .isActive(true)
                        .build());

        // ── Qualification schemes ────────────────────────────────────────────
        QualificationScheme qualScheme = qualificationSchemeRepository.save(
                QualificationScheme.builder()
                        .name("Стандартна квалификация")
                        .laneCount(6)
                        .isActive(true)
                        .build());

        QualificationScheme qualScheme2 = qualificationSchemeRepository.save(
                QualificationScheme.builder()
                        .name("Разширена квалификация")
                        .laneCount(8)
                        .isActive(true)
                        .build());

        // ── Competition groups ────────────────────────────────────────────────
        CompetitionGroupDefinition groupMenSenior = competitionGroupDefinitionRepository.save(
                CompetitionGroupDefinition.builder()
                        .name("Мъже Сениори")
                        .shortName("МС")
                        .gender(CompetitionGroupGender.MALE)
                        .minAge(19)
                        .maxAge(null)
                        .maxDisciplinesPerAthlete(3)
                        .isActive(true)
                        .build());

        CompetitionGroupDefinition groupWomenSenior = competitionGroupDefinitionRepository.save(
                CompetitionGroupDefinition.builder()
                        .name("Жени Сениори")
                        .shortName("ЖС")
                        .gender(CompetitionGroupGender.FEMALE)
                        .minAge(19)
                        .maxAge(null)
                        .maxDisciplinesPerAthlete(3)
                        .isActive(true)
                        .build());

        CompetitionGroupDefinition groupMenJunior = competitionGroupDefinitionRepository.save(
                CompetitionGroupDefinition.builder()
                        .name("Мъже Юниори")
                        .shortName("МЮ")
                        .gender(CompetitionGroupGender.MALE)
                        .minAge(16)
                        .maxAge(18)
                        .maxDisciplinesPerAthlete(2)
                        .isActive(true)
                        .build());

        // ── Discipline definitions ────────────────────────────────────────────
        DisciplineDefinition disc1x = disciplineDefinitionRepository.save(
                DisciplineDefinition.builder()
                        .name("Единична скул мъже")
                        .shortName("1x М")
                        .competitionGroupId(groupMenSenior.getId())
                        .boatClass(BoatClass._1X)
                        .crewSize(1)
                        .maxCrewFromTransfer(0)
                        .hasCoxswain(false)
                        .isLightweight(false)
                        .distanceMeters(2000)
                        .isActive(true)
                        .build());

        DisciplineDefinition disc2x = disciplineDefinitionRepository.save(
                DisciplineDefinition.builder()
                        .name("Двойна скул мъже")
                        .shortName("2x М")
                        .competitionGroupId(groupMenSenior.getId())
                        .boatClass(BoatClass._2X)
                        .crewSize(2)
                        .maxCrewFromTransfer(0)
                        .hasCoxswain(false)
                        .isLightweight(false)
                        .distanceMeters(2000)
                        .isActive(true)
                        .build());

        DisciplineDefinition disc1xW = disciplineDefinitionRepository.save(
                DisciplineDefinition.builder()
                        .name("Единична скул жени")
                        .shortName("1x Ж")
                        .competitionGroupId(groupWomenSenior.getId())
                        .boatClass(BoatClass._1X)
                        .crewSize(1)
                        .maxCrewFromTransfer(0)
                        .hasCoxswain(false)
                        .isLightweight(false)
                        .distanceMeters(2000)
                        .isActive(true)
                        .build());

        DisciplineDefinition disc4xJunior = disciplineDefinitionRepository.save(
                DisciplineDefinition.builder()
                        .name("Четворна скул юниори мъже")
                        .shortName("4x МЮ")
                        .competitionGroupId(groupMenJunior.getId())
                        .boatClass(BoatClass._4X)
                        .crewSize(4)
                        .maxCrewFromTransfer(0)
                        .hasCoxswain(false)
                        .isLightweight(false)
                        .distanceMeters(2000)
                        .isActive(true)
                        .build());

        // ── Real competition: Национален шампионат 2026 ──────────────────────
        Competition nationalChampionship = competitionRepository.save(
                Competition.builder()
                        .shortName("НШ2026")
                        .name("Национален шампионат по гребане 2026")
                        .location("Пловдив, Гребна база")
                        .startDate(LocalDate.of(2026, 5, 15))
                        .endDate(LocalDate.of(2026, 5, 17))
                        .status("PLANNED")
                        .scopeType("NATIONAL")
                        .scoringSchemeId(scoringScheme.getId())
                        .qualificationSchemeId(qualScheme.getId())
                        .build());

        // Assign disciplines to national championship
        competitionDisciplineSchemeRepository.save(
                CompetitionDisciplineScheme.builder()
                        .competitionId(nationalChampionship.getId())
                        .disciplineId(disc1x.getId())
                        .build());

        competitionDisciplineSchemeRepository.save(
                CompetitionDisciplineScheme.builder()
                        .competitionId(nationalChampionship.getId())
                        .disciplineId(disc2x.getId())
                        .build());

        competitionDisciplineSchemeRepository.save(
                CompetitionDisciplineScheme.builder()
                        .competitionId(nationalChampionship.getId())
                        .disciplineId(disc1xW.getId())
                        .build());

        // Timetable events for national championship (3 disciplines, 3 days)
        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(nationalChampionship.getId())
                        .disciplineId(disc1x.getId())
                        .qualificationEventType("H")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-05-15T09:00:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(nationalChampionship.getId())
                        .disciplineId(disc2x.getId())
                        .qualificationEventType("H")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-05-15T10:00:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(nationalChampionship.getId())
                        .disciplineId(disc1xW.getId())
                        .qualificationEventType("H")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-05-15T11:00:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(nationalChampionship.getId())
                        .disciplineId(disc1x.getId())
                        .qualificationEventType("FA")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-05-17T14:00:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(nationalChampionship.getId())
                        .disciplineId(disc2x.getId())
                        .qualificationEventType("FA")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-05-17T15:00:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(nationalChampionship.getId())
                        .disciplineId(disc1xW.getId())
                        .qualificationEventType("FA")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-05-17T16:00:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        // ── Real competition: Купа София 2026 (DRAFT/INTERNAL) ──────────────
        Competition cupSofia = competitionRepository.save(
                Competition.builder()
                        .shortName("КС2026")
                        .name("Купа София 2026")
                        .location("София, Панчарево")
                        .startDate(LocalDate.of(2026, 6, 6))
                        .endDate(LocalDate.of(2026, 6, 7))
                        .status("DRAFT")
                        .scopeType("INTERNAL")
                        .scoringSchemeId(scoringScheme2.getId())
                        .qualificationSchemeId(qualScheme2.getId())
                        .build());

        competitionDisciplineSchemeRepository.save(
                CompetitionDisciplineScheme.builder()
                        .competitionId(cupSofia.getId())
                        .disciplineId(disc1x.getId())
                        .build());

        competitionDisciplineSchemeRepository.save(
                CompetitionDisciplineScheme.builder()
                        .competitionId(cupSofia.getId())
                        .disciplineId(disc4xJunior.getId())
                        .build());

        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(cupSofia.getId())
                        .disciplineId(disc1x.getId())
                        .qualificationEventType("H")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-06-06T09:30:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(cupSofia.getId())
                        .disciplineId(disc4xJunior.getId())
                        .qualificationEventType("H")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-06-06T10:30:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        // ── Template competition ──────────────────────────────────────────────
        Competition templateComp = competitionRepository.save(
                Competition.builder()
                        .shortName("ШАБ")
                        .name("Шаблон за национален шампионат")
                        .location("Пловдив, Гребна база")
                        .startDate(LocalDate.of(2026, 6, 28))
                        .endDate(LocalDate.of(2026, 6, 29))
                        .entrySubmissionsOpenAt(Instant.parse("2026-06-01T00:00:00Z"))
                        .entrySubmissionsClosedAt(Instant.parse("2026-06-20T00:00:00Z"))
                        .lastChangesBeforeTmAt(Instant.parse("2026-06-26T00:00:00Z"))
                        .technicalMeetingAt(Instant.parse("2026-06-27T18:00:00Z"))
                        .status("DRAFT")
                        .scopeType("NATIONAL")
                        .scoringSchemeId(scoringScheme.getId())
                        .qualificationSchemeId(qualScheme.getId())
                        .build());

        competitionDisciplineSchemeRepository.save(
                CompetitionDisciplineScheme.builder()
                        .competitionId(templateComp.getId())
                        .disciplineId(disc1x.getId())
                        .build());

        competitionDisciplineSchemeRepository.save(
                CompetitionDisciplineScheme.builder()
                        .competitionId(templateComp.getId())
                        .disciplineId(disc1xW.getId())
                        .build());

        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(templateComp.getId())
                        .disciplineId(disc1x.getId())
                        .qualificationEventType("H")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-06-28T09:00:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        competitionTimetableEventRepository.save(
                CompetitionTimetableEvent.builder()
                        .competitionId(templateComp.getId())
                        .disciplineId(disc1xW.getId())
                        .qualificationEventType("H")
                        .qualificationStageNumber(1)
                        .scheduledAt(Instant.parse("2026-06-28T10:00:00Z"))
                        .eventStatus("SCHEDULED")
                        .build());

        log.info("Competition test data bootstrapped: 2 real competitions + 1 template, {} disciplines",
                disciplineDefinitionRepository.count());
    }
}

