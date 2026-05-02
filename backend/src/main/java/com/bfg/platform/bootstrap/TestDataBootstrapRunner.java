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
import com.bfg.platform.competition.entity.CompetitionGroupDefinition;
import com.bfg.platform.competition.entity.CompetitionFinalStanding;
import com.bfg.platform.competition.entity.CompetitionParticipation;
import com.bfg.platform.competition.entity.CompetitionTimetableEvent;
import com.bfg.platform.competition.entity.CrewMember;
import com.bfg.platform.competition.entity.DisciplineDefinition;
import com.bfg.platform.competition.entity.Entry;
import com.bfg.platform.competition.entity.QualificationScheme;
import com.bfg.platform.competition.entity.QualificationTier;
import com.bfg.platform.competition.entity.ScoringRule;
import com.bfg.platform.competition.entity.ScoringScheme;
import com.bfg.platform.competition.entity.ScoringSchemeBoatCoefficient;
import com.bfg.platform.competition.repository.CompetitionGroupDefinitionRepository;
import com.bfg.platform.competition.repository.CompetitionRepository;
import com.bfg.platform.competition.repository.CompetitionFinalStandingRepository;
import com.bfg.platform.competition.repository.CompetitionParticipationRepository;
import com.bfg.platform.competition.repository.CompetitionTimetableEventRepository;
import com.bfg.platform.competition.repository.CrewMemberRepository;
import com.bfg.platform.competition.repository.DisciplineDefinitionRepository;
import com.bfg.platform.competition.repository.EntryRepository;
import com.bfg.platform.competition.repository.QualificationSchemeRepository;
import com.bfg.platform.competition.repository.QualificationTierRepository;
import com.bfg.platform.competition.repository.ScoringRuleRepository;
import com.bfg.platform.competition.repository.ScoringSchemeBoatCoefficientRepository;
import com.bfg.platform.competition.repository.ScoringSchemeRepository;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.BoatClass;
import com.bfg.platform.gen.model.ClubCoachCreateRequest;
import com.bfg.platform.gen.model.ClubCreateRequest;
import com.bfg.platform.gen.model.ClubDto;
import com.bfg.platform.gen.model.CompetitionEventStatus;

import com.bfg.platform.gen.model.CompetitionType;
import com.bfg.platform.gen.model.DisciplineGender;
import com.bfg.platform.gen.model.Gender;
import com.bfg.platform.gen.model.ParticipationStatus;
import com.bfg.platform.gen.model.QualificationEventType;
import com.bfg.platform.gen.model.ScopeType;
import com.bfg.platform.gen.model.ScoringType;
import com.bfg.platform.gen.model.SeatPosition;
import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.gen.model.TransferRounding;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.bfg.platform.gen.model.QualificationEventType.FA;
import static com.bfg.platform.gen.model.QualificationEventType.FB;
import static com.bfg.platform.gen.model.QualificationEventType.H;
import static com.bfg.platform.gen.model.QualificationEventType.SF;

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
    private final ScoringRuleRepository scoringRuleRepository;
    private final ScoringSchemeBoatCoefficientRepository scoringSchemeBoatCoefficientRepository;
    private final QualificationSchemeRepository qualificationSchemeRepository;
    private final QualificationTierRepository qualificationTierRepository;
    private final CompetitionGroupDefinitionRepository competitionGroupDefinitionRepository;
    private final DisciplineDefinitionRepository disciplineDefinitionRepository;
    private final CompetitionRepository competitionRepository;
    private final CompetitionTimetableEventRepository competitionTimetableEventRepository;
    private final EntryRepository entryRepository;
    private final CrewMemberRepository crewMemberRepository;
    private final CompetitionParticipationRepository competitionParticipationRepository;
    private final CompetitionFinalStandingRepository competitionFinalStandingRepository;

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

        // ── Athletes (ages 10–27 for competition year 2026) ─────────────────
        int currentYear = LocalDate.now().getYear();
        int previousYear = currentYear - 1;
        UUID[] clubIds = { club1.getUuid(), club2.getUuid(), club3.getUuid(), club4.getUuid() };
        String[] clubPrefixes = { club1.getCardPrefix(), club2.getCardPrefix(), club3.getCardPrefix(), club4.getCardPrefix() };

        // Male athletes — birth years 1999-2016 (ages 27 down to 10 in 2026)
        String[][] males = {
            {"Иван", "Петров", "Иванов", "1999-03-15"},     // 27 - мъже
            {"Георги", "Стоянов", "Димитров", "1999-11-08"}, // 27
            {"Петър", "Иванов", "Петров", "2000-07-22"},      // 26
            {"Димитър", "Георгиев", "Василев", "2001-01-10"}, // 25
            {"Николай", "Петров", "Николов", "2002-05-18"},   // 24
            {"Стоян", "Димитров", "Стоянов", "2003-09-03"},   // 23
            {"Калин", "Иванов", "Русенски", "2004-02-28"},     // 22 - мъже под 23
            {"Мартин", "Стоянов", "Пловдивски", "2005-06-14"}, // 21
            {"Борис", "Петров", "Варненски", "2006-08-30"},    // 20
            {"Красимир", "Георгиев", "Софийски", "2007-04-12"},// 19 - мъже
            {"Пламен", "Димитров", "Русенски", "2008-01-25"},  // 18 - юн. старша
            {"Васил", "Стоянов", "Пловдивски", "2008-10-07"},  // 18
            {"Тодор", "Иванов", "Варненски", "2009-03-19"},    // 17 - юн. старша
            {"Александър", "Петров", "Софийски", "2009-07-11"}, // 17
            {"Радослав", "Георгиев", "Русенски", "2010-02-14"}, // 16 - юн. младша
            {"Даниел", "Димитров", "Пловдивски", "2010-08-26"}, // 16
            {"Кристиян", "Стоянов", "Варненски", "2011-05-03"}, // 15 - юн. младша
            {"Емил", "Иванов", "Софийски", "2011-11-18"},       // 15
            {"Светослав", "Петров", "Русенски", "2012-04-09"},  // 14 - кадети
            {"Виктор", "Георгиев", "Пловдивски", "2012-09-22"}, // 14
            {"Антон", "Димитров", "Варненски", "2013-01-30"},   // 13 - кадети
            {"Симеон", "Стоянов", "Софийски", "2013-06-15"},    // 13
            {"Божидар", "Иванов", "Русенски", "2014-03-08"},    // 12 - момчета
            {"Явор", "Петров", "Пловдивски", "2014-08-20"},     // 12
            {"Атанас", "Георгиев", "Варненски", "2015-01-12"},  // 11 - момчета
            {"Христо", "Димитров", "Софийски", "2015-07-27"},   // 11
            {"Лъчезар", "Стоянов", "Русенски", "2016-02-19"},   // 10 - момчета
            {"Деян", "Иванов", "Пловдивски", "2016-10-04"},     // 10
            {"Методи", "Петров", "Варненски", "2003-12-01"},    // 23
            {"Здравко", "Георгиев", "Софийски", "2005-03-17"},  // 21
            // Extra senior athletes (idx 30-39) for high-entry-count disciplines
            {"Тихомир", "Колев", "Пловдивски", "1997-08-12"},   // 29 - senior
            {"Огнян", "Найденов", "Варненски", "1998-03-25"},   // 28
            {"Ивайло", "Тодоров", "Софийски", "1999-11-07"},    // 27
            {"Веселин", "Христов", "Русенски", "2000-06-19"},   // 26
            {"Любомир", "Маринов", "Пловдивски", "2001-02-03"}, // 25
            {"Златко", "Добрев", "Варненски", "2002-09-14"},    // 24
            {"Тервел", "Атанасов", "Софийски", "2003-04-28"},   // 23
            {"Спас", "Костов", "Русенски", "2004-01-11"},       // 22
            {"Момчил", "Цветков", "Пловдивски", "1998-07-06"},  // 28
            {"Росен", "Благоев", "Варненски", "1999-12-22"},    // 27
        };

        // Female athletes — same age spread
        String[][] females = {
            {"Мария", "Петрова", "Иванова", "1999-06-20"},
            {"Елена", "Стоянова", "Георгиева", "2000-02-14"},
            {"Анна", "Иванова", "Димитрова", "2001-08-05"},
            {"Цветана", "Георгиева", "Василева", "2002-04-22"},
            {"Десислава", "Петрова", "Николова", "2003-10-11"},
            {"Радка", "Димитрова", "Стоянова", "2004-01-30"},
            {"Катерина", "Стоянова", "Пловдивска", "2005-05-16"},
            {"Йоана", "Иванова", "Варненска", "2006-09-28"},
            {"Силвия", "Петрова", "Софийска", "2007-03-07"},
            {"Теодора", "Георгиева", "Русенска", "2007-11-19"},
            {"Виктория", "Димитрова", "Пловдивска", "2008-06-13"},
            {"Габриела", "Стоянова", "Варненска", "2008-12-01"},
            {"Ралица", "Иванова", "Софийска", "2009-04-25"},
            {"Невена", "Петрова", "Русенска", "2009-08-17"},
            {"Диана", "Георгиева", "Пловдивска", "2010-01-09"},
            {"Ивана", "Димитрова", "Варненска", "2010-07-23"},
            {"Стефка", "Стоянова", "Софийска", "2011-03-14"},
            {"Борислава", "Иванова", "Русенска", "2011-09-06"},
            {"Милена", "Петрова", "Пловдивска", "2012-02-28"},
            {"Полина", "Георгиева", "Варненска", "2012-08-10"},
            {"Надя", "Димитрова", "Софийска", "2013-04-02"},
            {"Росица", "Стоянова", "Русенска", "2013-10-15"},
            {"Тамара", "Иванова", "Пловдивска", "2014-05-18"},
            {"Дарина", "Петрова", "Варненска", "2014-11-07"},
            {"Лора", "Георгиева", "Софийска", "2015-03-22"},
            {"Яна", "Димитрова", "Русенска", "2015-09-14"},
            {"Ева", "Стоянова", "Пловдивска", "2016-01-06"},
            {"Нора", "Иванова", "Варненска", "2016-06-28"},
            {"Петя", "Петрова", "Софийска", "2004-07-19"},
            {"Зорница", "Георгиева", "Русенска", "2006-12-03"},
            // Extra senior female athletes (idx 30-39)
            {"Ралица", "Колева", "Пловдивска", "1997-05-18"},
            {"Теодора", "Найденова", "Варненска", "1998-10-03"},
            {"Силвия", "Тодорова", "Софийска", "1999-07-21"},
            {"Златка", "Христова", "Русенска", "2000-03-15"},
            {"Биляна", "Маринова", "Пловдивска", "2001-08-27"},
            {"Невена", "Добрева", "Варненска", "2002-12-09"},
            {"Калина", "Атанасова", "Софийска", "2003-02-14"},
            {"Таня", "Костова", "Русенска", "2004-06-30"},
            {"Миглена", "Цветкова", "Пловдивска", "1998-11-12"},
            {"Ваня", "Благоева", "Варненска", "1999-04-25"},
            // Extra senior female athletes (idx 40-47) — for 4 heats in 1x Ж
            {"Антония", "Петкова", "Пловдивска", "1997-09-14"},
            {"Деница", "Стефанова", "Варненска", "1998-01-22"},
            {"Ива", "Кирилова", "Софийска", "2000-05-08"},
            {"Любомира", "Начева", "Русенска", "2001-11-17"},
            {"Стела", "Бориславова", "Пловдивска", "2002-07-03"},
            {"Цвета", "Радева", "Варненска", "2003-04-11"},
            {"Моника", "Тошева", "Софийска", "1999-08-29"},
            {"Бойка", "Захариева", "Русенска", "2000-02-06"},
        };

        List<Athlete> maleAthletes = new ArrayList<>();
        for (int i = 0; i < males.length; i++) {
            String[] m = males[i];
            Athlete a = createAthlete(m[0], m[1], m[2], Gender.MALE, LocalDate.parse(m[3]));
            maleAthletes.add(a);
            int clubIdx = i % 4;
            createAccreditation(a.getId(), clubIds[clubIdx], clubPrefixes[clubIdx], currentYear, AccreditationStatus.ACTIVE);
            if (i < 8) {
                createAccreditation(a.getId(), clubIds[clubIdx], clubPrefixes[clubIdx], previousYear, AccreditationStatus.EXPIRED);
            }
        }

        List<Athlete> femaleAthletes = new ArrayList<>();
        for (int i = 0; i < females.length; i++) {
            String[] f = females[i];
            Athlete a = createAthlete(f[0], f[1], f[2], Gender.FEMALE, LocalDate.parse(f[3]));
            femaleAthletes.add(a);
            int clubIdx = i % 4;
            createAccreditation(a.getId(), clubIds[clubIdx], clubPrefixes[clubIdx], currentYear, AccreditationStatus.ACTIVE);
            if (i < 8) {
                createAccreditation(a.getId(), clubIds[clubIdx], clubPrefixes[clubIdx], previousYear, AccreditationStatus.EXPIRED);
            }
        }

        // Rich historical trail for first male athlete
        Athlete athlete1 = maleAthletes.get(0);
        for (int y = 2012; y <= 2025; y++) {
            UUID cId = (y < 2018) ? club1.getUuid() : (y < 2022) ? club2.getUuid() : club3.getUuid();
            String cPrefix = (y < 2018) ? club1.getCardPrefix() : (y < 2022) ? club2.getCardPrefix() : club3.getCardPrefix();
            createAccreditation(athlete1.getId(), cId, cPrefix, y, AccreditationStatus.EXPIRED);
        }

        // NATIONAL scope: athletes and accreditations
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

        Athlete nationalAthlete5 = createAthlete("Пламен", "Националов", "Федеров", Gender.MALE, LocalDate.of(1997, 6, 8), ScopeType.NATIONAL);
        Athlete nationalAthlete6 = createAthlete("Йоанна", "", "Националова", Gender.FEMALE, LocalDate.of(1999, 12, 1), ScopeType.NATIONAL);
        createAccreditation(nationalAthlete5.getId(), nationalClub3.getUuid(), nationalClub3.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED, ScopeType.NATIONAL);
        createAccreditation(nationalAthlete5.getId(), nationalClub3.getUuid(), nationalClub3.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE, ScopeType.NATIONAL);
        createAccreditation(nationalAthlete6.getId(), nationalClub3.getUuid(), nationalClub3.getCardPrefix(), currentYear, AccreditationStatus.PENDING_VALIDATION, ScopeType.NATIONAL);

        // EXTERNAL scope
        Athlete externalAthlete1 = createAthlete("Владимир", "Външен", "Външнов", Gender.MALE, LocalDate.of(1994, 4, 11), ScopeType.EXTERNAL);
        Athlete externalAthlete2 = createAthlete("Теодора", "", "Външнова", Gender.FEMALE, LocalDate.of(1997, 7, 29), ScopeType.EXTERNAL);
        createAccreditation(externalAthlete1.getId(), externalClub.getUuid(), externalClub.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED, ScopeType.EXTERNAL);
        createAccreditation(externalAthlete1.getId(), externalClub.getUuid(), externalClub.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE, ScopeType.EXTERNAL);
        createAccreditation(externalAthlete2.getId(), externalClub.getUuid(), externalClub.getCardPrefix(), currentYear, AccreditationStatus.PENDING_VALIDATION, ScopeType.EXTERNAL);

        Athlete externalAthlete3 = createAthlete("Мартин", "Външен", "Партньоров", Gender.MALE, LocalDate.of(1996, 3, 19), ScopeType.EXTERNAL);
        Athlete externalAthlete4 = createAthlete("Виктория", "", "Външнова", Gender.FEMALE, LocalDate.of(2001, 8, 7), ScopeType.EXTERNAL);
        createAccreditation(externalAthlete3.getId(), externalClub2.getUuid(), externalClub2.getCardPrefix(), previousYear, AccreditationStatus.EXPIRED, ScopeType.EXTERNAL);
        createAccreditation(externalAthlete3.getId(), externalClub2.getUuid(), externalClub2.getCardPrefix(), currentYear, AccreditationStatus.ACTIVE, ScopeType.EXTERNAL);
        createAccreditation(externalAthlete4.getId(), externalClub2.getUuid(), externalClub2.getCardPrefix(), currentYear, AccreditationStatus.NEW_PHOTO_REQUIRED, ScopeType.EXTERNAL);

        bootstrapCompetitionData(
                club1.getUuid(), club2.getUuid(), club3.getUuid(), club4.getUuid(),
                maleAthletes, femaleAthletes);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  COMPETITION DATA
    // ═════════════════════════════════════════════════════════════════════════

    private void bootstrapCompetitionData(
            UUID club1Id, UUID club2Id, UUID club3Id, UUID club4Id,
            List<Athlete> maleAthletes, List<Athlete> femaleAthletes) {
        if (!competitionRepository.findAll().isEmpty()) return;

        // ── Scoring schemes ─────────────────────────────────────────────────
        ScoringScheme scoringDish = scoringSchemeRepository.save(ScoringScheme.builder()
                .name("ДИШ/ДОШ Точкуване").scoringType(ScoringType.FIXED).isActive(true).build());

        // Boat coefficients per Чл. 68: Скифове 1.5, Двойки 2, Четворки 3, Осморки 4
        Map<BoatClass, String> coeff = Map.of(
                BoatClass.SINGLE_SCULL, "1.5",
                BoatClass.DOUBLE_SCULL, "2", BoatClass.PAIR, "2", BoatClass.COXED_PAIR, "2",
                BoatClass.QUAD, "3", BoatClass.COXED_QUAD, "3", BoatClass.FOUR, "3", BoatClass.COXED_FOUR, "3",
                BoatClass.EIGHT, "4");
        coeff.forEach((bc, c) -> scoringSchemeBoatCoefficientRepository.save(
                ScoringSchemeBoatCoefficient.builder()
                        .scoringSchemeId(scoringDish.getId()).boatClass(bc).coefficient(new BigDecimal(c)).build()));

        // Scoring rules per Чл. 68: place 1→25, 2→21, … 12→1
        int[][] dishPoints = {{1,25},{2,21},{3,18},{4,15},{5,13},{6,11},{7,9},{8,7},{9,5},{10,3},{11,2},{12,1}};
        for (int[] pp : dishPoints) {
            scoringRuleRepository.save(ScoringRule.builder()
                    .scoringSchemeId(scoringDish.getId()).placement(pp[0]).basePoints(new BigDecimal(pp[1])).build());
        }

        ScoringScheme scoringErg = scoringSchemeRepository.save(ScoringScheme.builder()
                .name("ДПГЕ Точкуване").scoringType(ScoringType.FIXED).isActive(true).build());

        // Scoring rules per Чл. 69: place 1→25, 2→21, … 12→1
        int[][] ergPoints = {{1,25},{2,21},{3,18},{4,15},{5,13},{6,11},{7,9},{8,7},{9,5},{10,3},{11,2},{12,1}};
        for (int[] pp : ergPoints) {
            scoringRuleRepository.save(ScoringRule.builder()
                    .scoringSchemeId(scoringErg.getId()).placement(pp[0]).basePoints(new BigDecimal(pp[1])).build());
        }

        // ── Qualification schemes ───────────────────────────────────────────
        QualificationScheme qualSenior = qualificationSchemeRepository.save(QualificationScheme.builder()
                .name("Старша квалификация").laneCount(7).isActive(true).build());
        int[][] seniorTiers = {{1,7,0,0,0,1},{8,14,2,0,0,1},{15,21,3,0,0,1},{22,28,4,0,0,1}};
        for (int[] t : seniorTiers) {
            qualificationTierRepository.save(QualificationTier.builder()
                    .qualificationSchemeId(qualSenior.getId())
                    .boatCountMin(t[0]).boatCountMax(t[1]).heatCount(t[2])
                    .semiFinalCount(t[3]).finalBCount(t[4]).finalACount(t[5]).build());
        }

        QualificationScheme qualJunior = qualificationSchemeRepository.save(QualificationScheme.builder()
                .name("Младша квалификация").laneCount(7).isActive(true).build());
        int[][] juniorTiers = {{1,7,0,0,0,1},{8,14,2,0,1,1},{15,21,3,2,1,1},{22,28,4,2,1,1}};
        for (int[] t : juniorTiers) {
            qualificationTierRepository.save(QualificationTier.builder()
                    .qualificationSchemeId(qualJunior.getId())
                    .boatCountMin(t[0]).boatCountMax(t[1]).heatCount(t[2])
                    .semiFinalCount(t[3]).finalBCount(t[4]).finalACount(t[5]).build());
        }

        // ── Competition Groups (Чл. 4-5, Чл. 7, Чл. 15) ───────────────────
        // Non-transfer groups first
        CompetitionGroupDefinition g12 = saveGroup("12-годишни", "12", 10, 12, 2, null, null, null, null, null, null, null, null, null, null, null);
        CompetitionGroupDefinition g14 = saveGroup("Кадети", "14", 13, 14, 2, null, null, null, null, null, null, null, "35", null, null, "35");
        CompetitionGroupDefinition g16 = saveGroup("Юноши/Девойки мл.", "16", 15, 16, 2, null, null, null, null, null, null, null, "40", null, null, "35");
        CompetitionGroupDefinition g18LK = saveGroup("Юноши/Девойки ст. ЛК", "18ЛК", 17, 18, 3, null, null, null, null, null, "55", "55", "67.5", "55", "55", "54");
        CompetitionGroupDefinition gLK = saveGroup("Мъже/Жени ЛК", "ЛК", 19, null, 3, null, null, null, null, null, "55", "55", "72.5", "55", "55", "59");

        // Transfer groups
        CompetitionGroupDefinition g18 = saveGroup("Юноши/Девойки ст.", "18", 17, 18, 3, g16.getId(), 35, TransferRounding.FLOOR, 2, 2, "55", "55", null, "55", "55", null);
        CompetitionGroupDefinition gSenior = saveGroup("Мъже/Жени", "М/Ж", 19, null, 3, g18.getId(), 35, TransferRounding.FLOOR, 2, 2, "55", "55", null, "55", "55", null);

        // ── Disciplines (Чл. 9) ─────────────────────────────────────────────
        // М12 (500m, 3 boats)
        DisciplineDefinition dM12_1x = disc("Скиф момчета", "1x М12", g12, BoatClass.SINGLE_SCULL, 1, false, false, 500, 3, 0, DisciplineGender.MALE);
        DisciplineDefinition dM12_2x = disc("Двойка скул момчета", "2x М12", g12, BoatClass.DOUBLE_SCULL, 2, false, false, 500, 3, 0, DisciplineGender.MALE);
        // Ж12 (500m, 3 boats)
        DisciplineDefinition dF12_1x = disc("Скиф момичета", "1x Ж12", g12, BoatClass.SINGLE_SCULL, 1, false, false, 500, 3, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF12_2x = disc("Двойка скул момичета", "2x Ж12", g12, BoatClass.DOUBLE_SCULL, 2, false, false, 500, 3, 0, DisciplineGender.FEMALE);

        // М14 (1000m, 2 boats)
        DisciplineDefinition dM14_1x = disc("Скиф кадети", "1x М14", g14, BoatClass.SINGLE_SCULL, 1, false, false, 1000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM14_2x = disc("Двойка скул кадети", "2x М14", g14, BoatClass.DOUBLE_SCULL, 2, false, false, 1000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM14_4xp = disc("Четворка скул+ кадети", "4x+ М14", g14, BoatClass.COXED_QUAD, 4, true, false, 1000, 2, 0, DisciplineGender.MALE);
        // Ж14 (1000m, 2 boats)
        DisciplineDefinition dF14_1x = disc("Скиф кадетки", "1x Ж14", g14, BoatClass.SINGLE_SCULL, 1, false, false, 1000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF14_2x = disc("Двойка скул кадетки", "2x Ж14", g14, BoatClass.DOUBLE_SCULL, 2, false, false, 1000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF14_4xp = disc("Четворка скул+ кадетки", "4x+ Ж14", g14, BoatClass.COXED_QUAD, 4, true, false, 1000, 2, 0, DisciplineGender.FEMALE);

        // М16 (1000m, 2 boats)
        DisciplineDefinition dM16_4p = disc("Четворка+ юн. мл.", "4+ М16", g16, BoatClass.COXED_FOUR, 4, true, false, 1000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM16_2x = disc("Двойка скул юн. мл.", "2x М16", g16, BoatClass.DOUBLE_SCULL, 2, false, false, 1000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM16_2m = disc("Двойка без юн. мл.", "2- М16", g16, BoatClass.PAIR, 2, false, false, 1000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM16_1x = disc("Скиф юн. мл.", "1x М16", g16, BoatClass.SINGLE_SCULL, 1, false, false, 1000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM16_4x = disc("Четворка скул юн. мл.", "4x М16", g16, BoatClass.QUAD, 4, false, false, 1000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM16_4m = disc("Четворка без юн. мл.", "4- М16", g16, BoatClass.FOUR, 4, false, false, 1000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM16_8p = disc("Осморка юн. мл.", "8+ М16", g16, BoatClass.EIGHT, 8, true, false, 1000, 2, 0, DisciplineGender.MALE);

        // Ж16 (1000m, 2 boats)
        DisciplineDefinition dF16_2x = disc("Двойка скул дев. мл.", "2x Ж16", g16, BoatClass.DOUBLE_SCULL, 2, false, false, 1000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF16_2m = disc("Двойка без дев. мл.", "2- Ж16", g16, BoatClass.PAIR, 2, false, false, 1000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF16_1x = disc("Скиф дев. мл.", "1x Ж16", g16, BoatClass.SINGLE_SCULL, 1, false, false, 1000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF16_4x = disc("Четворка скул дев. мл.", "4x Ж16", g16, BoatClass.QUAD, 4, false, false, 1000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF16_8p = disc("Осморка дев. мл.", "8+ Ж16", g16, BoatClass.EIGHT, 8, true, false, 1000, 2, 0, DisciplineGender.FEMALE);

        // М18 (2000m, 2 boats, transfer)
        DisciplineDefinition dM18_4p = disc("Четворка+ юн. ст.", "4+ М18", g18, BoatClass.COXED_FOUR, 4, true, false, 2000, 2, 1, DisciplineGender.MALE);
        DisciplineDefinition dM18_2x = disc("Двойка скул юн. ст.", "2x М18", g18, BoatClass.DOUBLE_SCULL, 2, false, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM18_2m = disc("Двойка без юн. ст.", "2- М18", g18, BoatClass.PAIR, 2, false, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM18_1x = disc("Скиф юн. ст.", "1x М18", g18, BoatClass.SINGLE_SCULL, 1, false, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM18_2p = disc("Двойка с+ юн. ст.", "2+ М18", g18, BoatClass.COXED_PAIR, 2, true, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM18_4x = disc("Четворка скул юн. ст.", "4x М18", g18, BoatClass.QUAD, 4, false, false, 2000, 2, 1, DisciplineGender.MALE);
        DisciplineDefinition dM18_4m = disc("Четворка без юн. ст.", "4- М18", g18, BoatClass.FOUR, 4, false, false, 2000, 2, 1, DisciplineGender.MALE);
        DisciplineDefinition dM18_8p = disc("Осморка юн. ст.", "8+ М18", g18, BoatClass.EIGHT, 8, true, false, 2000, 2, 3, DisciplineGender.MALE);

        // Ж18 (2000m, 2 boats, transfer)
        DisciplineDefinition dF18_4m = disc("Четворка без дев. ст.", "4- Ж18", g18, BoatClass.FOUR, 4, false, false, 2000, 2, 1, DisciplineGender.FEMALE);
        DisciplineDefinition dF18_2x = disc("Двойка скул дев. ст.", "2x Ж18", g18, BoatClass.DOUBLE_SCULL, 2, false, false, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF18_2m = disc("Двойка без дев. ст.", "2- Ж18", g18, BoatClass.PAIR, 2, false, false, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF18_1x = disc("Скиф дев. ст.", "1x Ж18", g18, BoatClass.SINGLE_SCULL, 1, false, false, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF18_4x = disc("Четворка скул дев. ст.", "4x Ж18", g18, BoatClass.QUAD, 4, false, false, 2000, 2, 1, DisciplineGender.FEMALE);
        DisciplineDefinition dF18_8p = disc("Осморка дев. ст.", "8+ Ж18", g18, BoatClass.EIGHT, 8, true, false, 2000, 2, 3, DisciplineGender.FEMALE);

        // М18ЛК (2000m, 2 boats)
        DisciplineDefinition dM18LK_1x = disc("Скиф юн. ст. ЛК", "1x М18ЛК", g18LK, BoatClass.SINGLE_SCULL, 1, false, true, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM18LK_2m = disc("Двойка без юн. ст. ЛК", "2- М18ЛК", g18LK, BoatClass.PAIR, 2, false, true, 2000, 2, 0, DisciplineGender.MALE);
        // Ж18ЛК (2000m, 2 boats)
        DisciplineDefinition dF18LK_1x = disc("Скиф дев. ст. ЛК", "1x Ж18ЛК", g18LK, BoatClass.SINGLE_SCULL, 1, false, true, 2000, 2, 0, DisciplineGender.FEMALE);

        // М (2000m, 2 boats, transfer)
        DisciplineDefinition dM_4p = disc("Четворка+ мъже", "4+ М", gSenior, BoatClass.COXED_FOUR, 4, true, false, 2000, 2, 1, DisciplineGender.MALE);
        DisciplineDefinition dM_2x = disc("Двойка скул мъже", "2x М", gSenior, BoatClass.DOUBLE_SCULL, 2, false, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM_2m = disc("Двойка без мъже", "2- М", gSenior, BoatClass.PAIR, 2, false, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM_1x = disc("Скиф мъже", "1x М", gSenior, BoatClass.SINGLE_SCULL, 1, false, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM_2p = disc("Двойка с+ мъже", "2+ М", gSenior, BoatClass.COXED_PAIR, 2, true, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dM_4x = disc("Четворка скул мъже", "4x М", gSenior, BoatClass.QUAD, 4, false, false, 2000, 2, 1, DisciplineGender.MALE);
        DisciplineDefinition dM_4m = disc("Четворка без мъже", "4- М", gSenior, BoatClass.FOUR, 4, false, false, 2000, 2, 1, DisciplineGender.MALE);
        DisciplineDefinition dM_8p = disc("Осморка мъже", "8+ М", gSenior, BoatClass.EIGHT, 8, true, false, 2000, 2, 3, DisciplineGender.MALE);

        // Ж (2000m, 2 boats, transfer)
        DisciplineDefinition dF_4m = disc("Четворка без жени", "4- Ж", gSenior, BoatClass.FOUR, 4, false, false, 2000, 2, 1, DisciplineGender.FEMALE);
        DisciplineDefinition dF_2x = disc("Двойка скул жени", "2x Ж", gSenior, BoatClass.DOUBLE_SCULL, 2, false, false, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF_2m = disc("Двойка без жени", "2- Ж", gSenior, BoatClass.PAIR, 2, false, false, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF_1x = disc("Скиф жени", "1x Ж", gSenior, BoatClass.SINGLE_SCULL, 1, false, false, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dF_4x = disc("Четворка скул жени", "4x Ж", gSenior, BoatClass.QUAD, 4, false, false, 2000, 2, 1, DisciplineGender.FEMALE);
        DisciplineDefinition dF_8p = disc("Осморка жени", "8+ Ж", gSenior, BoatClass.EIGHT, 8, true, false, 2000, 2, 3, DisciplineGender.FEMALE);

        // МЛК (2000m, 2 boats)
        DisciplineDefinition dMLK_1x = disc("Скиф мъже ЛК", "1x МЛК", gLK, BoatClass.SINGLE_SCULL, 1, false, true, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dMLK_2x = disc("Двойка скул мъже ЛК", "2x МЛК", gLK, BoatClass.DOUBLE_SCULL, 2, false, true, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dMLK_2m = disc("Двойка без мъже ЛК", "2- МЛК", gLK, BoatClass.PAIR, 2, false, true, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dMLK_4m = disc("Четворка без мъже ЛК", "4- МЛК", gLK, BoatClass.FOUR, 4, false, true, 2000, 2, 0, DisciplineGender.MALE);
        // ЖЛК (2000m, 2 boats)
        DisciplineDefinition dFLK_1x = disc("Скиф жени ЛК", "1x ЖЛК", gLK, BoatClass.SINGLE_SCULL, 1, false, true, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dFLK_2x = disc("Двойка скул жени ЛК", "2x ЖЛК", gLK, BoatClass.DOUBLE_SCULL, 2, false, true, 2000, 2, 0, DisciplineGender.FEMALE);

        // Смесени дисциплини — М/Ж (Seniors, 2000m)
        DisciplineDefinition dMix_2x = disc("Двойка скул смесена", "2x Mix", gSenior, BoatClass.DOUBLE_SCULL, 2, false, false, 2000, 2, 0, DisciplineGender.MIXED);
        DisciplineDefinition dMix_2p = disc("Двойка с+ смесена", "2+ Mix", gSenior, BoatClass.COXED_PAIR, 2, true, false, 2000, 2, 0, DisciplineGender.MIXED);

        // Смесени дисциплини — 18 (2000m)
        DisciplineDefinition dMix18_2x = disc("Двойка скул смесена 18", "2x Mix18", g18, BoatClass.DOUBLE_SCULL, 2, false, false, 2000, 2, 0, DisciplineGender.MIXED);

        // ── Competitions ─────────────────────────────────────────────────────

        // 1. ДИШ 2026 — full national championship with ALL 60 disciplines
        // Submission period: 1 day before now → 5 days after now (for testing)
        Instant submissionOpenAt = Instant.now().minus(java.time.Duration.ofDays(1));
        Instant submissionClosedAt = Instant.now().plus(java.time.Duration.ofDays(5));
        Instant lastChangesAt = Instant.now().plus(java.time.Duration.ofDays(4));
        Instant technicalMeetingAt = Instant.now().plus(java.time.Duration.ofDays(5));

        Competition dish = competitionRepository.save(Competition.builder()
                .shortName("ДИШ2026").name("Държавен индивидуален шампионат 2026")
                .location("Пловдив, Гребна база").startDate(LocalDate.of(2026, 5, 15)).endDate(LocalDate.of(2026, 5, 17))
                .entrySubmissionsOpenAt(submissionOpenAt)
                .entrySubmissionsClosedAt(submissionClosedAt)
                .lastChangesBeforeTmAt(lastChangesAt)
                .technicalMeetingAt(technicalMeetingAt)
                .awardingCeremonyAt(Instant.parse("2026-05-17T17:00:00Z"))
                .scoringSchemeId(scoringDish.getId()).qualificationSchemeId(qualSenior.getId())
                .competitionType(CompetitionType.NATIONAL_WATER).isTemplate(false).build());

        // Day 1 — Heats: senior groups morning, junior groups afternoon
        // Мъже + Жени (2000m)
        // dM_1x: 20 entries → tier 15-21 → 3 heats needed
        ttEvent(dish, dM_1x, H, "2026-05-15T07:30:00Z"); ttEvent(dish, dM_1x, H, "2026-05-15T07:35:00Z");
        ttEvent(dish, dM_1x, H, "2026-05-15T07:40:00Z");
        // dM_2x: 11 entries → tier 8-14 → 2 heats needed
        ttEvent(dish, dM_2x, H, "2026-05-15T07:45:00Z"); ttEvent(dish, dM_2x, H, "2026-05-15T07:50:00Z");
        ttEvent(dish, dM_2m, H, "2026-05-15T08:00:00Z"); ttEvent(dish, dM_2p, H, "2026-05-15T08:15:00Z");
        ttEvent(dish, dM_4x, H, "2026-05-15T08:30:00Z"); ttEvent(dish, dM_4m, H, "2026-05-15T08:45:00Z");
        ttEvent(dish, dM_4p, H, "2026-05-15T09:00:00Z"); ttEvent(dish, dM_8p, H, "2026-05-15T09:15:00Z");
        // dF_1x: 28 entries → tier 22-28 → 4 heats needed
        ttEvent(dish, dF_1x, H, "2026-05-15T09:30:00Z"); ttEvent(dish, dF_1x, H, "2026-05-15T09:35:00Z");
        ttEvent(dish, dF_1x, H, "2026-05-15T09:40:00Z"); ttEvent(dish, dF_1x, H, "2026-05-15T09:45:00Z");
        // dF_2x: 11 entries → tier 8-14 → 2 heats needed, only 1 scheduled → SKIP test case
        ttEvent(dish, dF_2x, H, "2026-05-15T09:45:00Z");
        ttEvent(dish, dF_2m, H, "2026-05-15T10:00:00Z"); ttEvent(dish, dF_4x, H, "2026-05-15T10:15:00Z");
        ttEvent(dish, dF_4m, H, "2026-05-15T10:30:00Z"); ttEvent(dish, dF_8p, H, "2026-05-15T10:45:00Z");
        // МЛК + ЖЛК
        ttEvent(dish, dMLK_1x, H, "2026-05-15T11:00:00Z"); ttEvent(dish, dMLK_2x, H, "2026-05-15T11:15:00Z");
        ttEvent(dish, dMLK_2m, H, "2026-05-15T11:30:00Z"); ttEvent(dish, dMLK_4m, H, "2026-05-15T11:45:00Z");
        ttEvent(dish, dFLK_1x, H, "2026-05-15T12:00:00Z"); ttEvent(dish, dFLK_2x, H, "2026-05-15T12:15:00Z");
        // Смесени (Mixed) heats
        ttEvent(dish, dMix_2x, H, "2026-05-15T12:30:00Z");
        ttEvent(dish, dMix_2p, H, "2026-05-15T12:45:00Z");
        // М18 + Ж18 (2000m)
        ttEvent(dish, dM18_1x, H, "2026-05-15T13:00:00Z"); ttEvent(dish, dM18_2x, H, "2026-05-15T13:15:00Z");
        ttEvent(dish, dM18_2m, H, "2026-05-15T13:30:00Z"); ttEvent(dish, dM18_2p, H, "2026-05-15T13:45:00Z");
        ttEvent(dish, dM18_4x, H, "2026-05-15T14:00:00Z"); ttEvent(dish, dM18_4m, H, "2026-05-15T14:15:00Z");
        ttEvent(dish, dM18_4p, H, "2026-05-15T14:30:00Z"); ttEvent(dish, dM18_8p, H, "2026-05-15T14:45:00Z");
        ttEvent(dish, dF18_1x, H, "2026-05-15T15:00:00Z"); ttEvent(dish, dF18_2x, H, "2026-05-15T15:15:00Z");
        ttEvent(dish, dF18_2m, H, "2026-05-15T15:30:00Z"); ttEvent(dish, dF18_4x, H, "2026-05-15T15:45:00Z");
        ttEvent(dish, dF18_4m, H, "2026-05-15T16:00:00Z"); ttEvent(dish, dF18_8p, H, "2026-05-15T16:15:00Z");
        // Смесени 18 heat
        ttEvent(dish, dMix18_2x, H, "2026-05-15T16:20:00Z");
        // М18ЛК + Ж18ЛК
        ttEvent(dish, dM18LK_1x, H, "2026-05-15T16:30:00Z"); ttEvent(dish, dM18LK_2m, H, "2026-05-15T16:45:00Z");
        ttEvent(dish, dF18LK_1x, H, "2026-05-15T17:00:00Z");

        // Day 1 afternoon — М16 + Ж16 (1000m)
        // dM16_1x: 8 entries → tier 8-14 → 2 heats needed
        ttEvent(dish, dM16_1x, H, "2026-05-15T17:15:00Z"); ttEvent(dish, dM16_1x, H, "2026-05-15T17:20:00Z");
        ttEvent(dish, dM16_2x, H, "2026-05-15T17:30:00Z");
        ttEvent(dish, dM16_2m, H, "2026-05-15T17:45:00Z"); ttEvent(dish, dM16_4x, H, "2026-05-15T18:00:00Z");
        ttEvent(dish, dM16_4m, H, "2026-05-15T18:15:00Z"); ttEvent(dish, dM16_4p, H, "2026-05-15T18:30:00Z");
        ttEvent(dish, dM16_8p, H, "2026-05-15T18:45:00Z");
        ttEvent(dish, dF16_1x, H, "2026-05-15T19:00:00Z"); ttEvent(dish, dF16_2x, H, "2026-05-15T19:15:00Z");
        ttEvent(dish, dF16_2m, H, "2026-05-15T19:30:00Z"); ttEvent(dish, dF16_4x, H, "2026-05-15T19:45:00Z");
        ttEvent(dish, dF16_8p, H, "2026-05-15T20:00:00Z");
        // М14 + Ж14 (1000m)
        ttEvent(dish, dM14_1x, H, "2026-05-16T07:30:00Z"); ttEvent(dish, dM14_2x, H, "2026-05-16T07:45:00Z");
        ttEvent(dish, dM14_4xp, H, "2026-05-16T08:00:00Z");
        ttEvent(dish, dF14_1x, H, "2026-05-16T08:15:00Z"); ttEvent(dish, dF14_2x, H, "2026-05-16T08:30:00Z");
        ttEvent(dish, dF14_4xp, H, "2026-05-16T08:45:00Z");
        // М12 + Ж12 (500m)
        ttEvent(dish, dM12_1x, H, "2026-05-16T09:00:00Z"); ttEvent(dish, dM12_2x, H, "2026-05-16T09:15:00Z");
        ttEvent(dish, dF12_1x, H, "2026-05-16T09:30:00Z"); ttEvent(dish, dF12_2x, H, "2026-05-16T09:45:00Z");

        // Day 3 — Finals (all groups)
        ttEvent(dish, dM12_1x, FA, "2026-05-17T07:30:00Z"); ttEvent(dish, dM12_2x, FA, "2026-05-17T07:40:00Z");
        ttEvent(dish, dF12_1x, FA, "2026-05-17T07:50:00Z"); ttEvent(dish, dF12_2x, FA, "2026-05-17T08:00:00Z");
        ttEvent(dish, dM14_1x, FA, "2026-05-17T08:10:00Z"); ttEvent(dish, dM14_2x, FA, "2026-05-17T08:20:00Z");
        ttEvent(dish, dM14_4xp, FA, "2026-05-17T08:30:00Z");
        ttEvent(dish, dF14_1x, FA, "2026-05-17T08:40:00Z"); ttEvent(dish, dF14_2x, FA, "2026-05-17T08:50:00Z");
        ttEvent(dish, dF14_4xp, FA, "2026-05-17T09:00:00Z");
        ttEvent(dish, dM16_1x, FA, "2026-05-17T09:15:00Z"); ttEvent(dish, dM16_2x, FA, "2026-05-17T09:30:00Z");
        ttEvent(dish, dM16_2m, FA, "2026-05-17T09:45:00Z"); ttEvent(dish, dM16_4x, FA, "2026-05-17T10:00:00Z");
        ttEvent(dish, dM16_4m, FA, "2026-05-17T10:15:00Z"); ttEvent(dish, dM16_4p, FA, "2026-05-17T10:30:00Z");
        ttEvent(dish, dM16_8p, FA, "2026-05-17T10:45:00Z");
        ttEvent(dish, dF16_1x, FA, "2026-05-17T11:00:00Z"); ttEvent(dish, dF16_2x, FA, "2026-05-17T11:15:00Z");
        ttEvent(dish, dF16_2m, FA, "2026-05-17T11:30:00Z"); ttEvent(dish, dF16_4x, FA, "2026-05-17T11:45:00Z");
        ttEvent(dish, dF16_8p, FA, "2026-05-17T12:00:00Z");
        // Lunch break
        ttEvent(dish, dM18_1x, FA, "2026-05-17T13:00:00Z"); ttEvent(dish, dM18_2x, FA, "2026-05-17T13:15:00Z");
        ttEvent(dish, dM18_2m, FA, "2026-05-17T13:30:00Z"); ttEvent(dish, dM18_2p, FA, "2026-05-17T13:45:00Z");
        ttEvent(dish, dM18_4x, FA, "2026-05-17T14:00:00Z"); ttEvent(dish, dM18_4m, FA, "2026-05-17T14:15:00Z");
        ttEvent(dish, dM18_4p, FA, "2026-05-17T14:30:00Z"); ttEvent(dish, dM18_8p, FA, "2026-05-17T14:45:00Z");
        ttEvent(dish, dF18_1x, FA, "2026-05-17T15:00:00Z"); ttEvent(dish, dF18_2x, FA, "2026-05-17T15:15:00Z");
        ttEvent(dish, dF18_2m, FA, "2026-05-17T15:30:00Z"); ttEvent(dish, dF18_4x, FA, "2026-05-17T15:45:00Z");
        ttEvent(dish, dF18_4m, FA, "2026-05-17T16:00:00Z"); ttEvent(dish, dF18_8p, FA, "2026-05-17T16:15:00Z");
        ttEvent(dish, dM18LK_1x, FA, "2026-05-17T16:30:00Z"); ttEvent(dish, dM18LK_2m, FA, "2026-05-17T16:45:00Z");
        ttEvent(dish, dF18LK_1x, FA, "2026-05-17T17:00:00Z");
        ttEvent(dish, dM_1x, FA, "2026-05-17T17:15:00Z"); ttEvent(dish, dM_2x, FA, "2026-05-17T17:30:00Z");
        ttEvent(dish, dM_2m, FA, "2026-05-17T17:45:00Z"); ttEvent(dish, dM_2p, FA, "2026-05-17T18:00:00Z");
        ttEvent(dish, dM_4x, FA, "2026-05-17T18:15:00Z"); ttEvent(dish, dM_4m, FA, "2026-05-17T18:30:00Z");
        ttEvent(dish, dM_4p, FA, "2026-05-17T18:45:00Z"); ttEvent(dish, dM_8p, FA, "2026-05-17T19:00:00Z");
        ttEvent(dish, dF_1x, FA, "2026-05-17T19:15:00Z"); ttEvent(dish, dF_2x, FA, "2026-05-17T19:30:00Z");
        ttEvent(dish, dF_2m, FA, "2026-05-17T19:45:00Z"); ttEvent(dish, dF_4x, FA, "2026-05-17T20:00:00Z");
        ttEvent(dish, dF_4m, FA, "2026-05-17T20:15:00Z"); ttEvent(dish, dF_8p, FA, "2026-05-17T20:30:00Z");
        ttEvent(dish, dMLK_1x, FA, "2026-05-17T20:45:00Z"); ttEvent(dish, dMLK_2x, FA, "2026-05-17T21:00:00Z");
        ttEvent(dish, dMLK_2m, FA, "2026-05-17T21:15:00Z"); ttEvent(dish, dMLK_4m, FA, "2026-05-17T21:30:00Z");
        ttEvent(dish, dFLK_1x, FA, "2026-05-17T21:45:00Z"); ttEvent(dish, dFLK_2x, FA, "2026-05-17T22:00:00Z");
        // Смесени (Mixed) finals
        ttEvent(dish, dMix_2x, FA, "2026-05-17T22:15:00Z");
        ttEvent(dish, dMix_2p, FA, "2026-05-17T22:30:00Z");
        ttEvent(dish, dMix18_2x, FA, "2026-05-17T22:45:00Z");

        // ── Sample entries for clubs 2, 3, 4 (club 1 = user will test manually) ──

        // Club 2 (ГКВ) — Мъже
        createEntry(dish.getId(), club2Id, dM_1x.getId(), 1, maleAthletes.get(1).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dM_1x.getId(), 2, maleAthletes.get(29).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dM_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(1).getId()}, {SeatPosition.BOW, maleAthletes.get(5).getId()}});
        createEntry(dish.getId(), club2Id, dM_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(9).getId()}, {SeatPosition.BOW, maleAthletes.get(29).getId()}});
        // Club 2 — М18, М16, М14, М12
        createEntry(dish.getId(), club2Id, dM18_1x.getId(), 1, maleAthletes.get(13).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dM16_1x.getId(), 1, maleAthletes.get(17).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dM14_1x.getId(), 1, maleAthletes.get(21).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dM12_1x.getId(), 1, maleAthletes.get(25).getId(), SeatPosition.STROKE);
        // М14 4x+ (coxed quad): [21],[25],[17],[13] + cox [femaleAthletes.get(25)]
        createEntry(dish.getId(), club2Id, dM14_4xp.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(21).getId()},
                    {SeatPosition.THREE, maleAthletes.get(25).getId()},
                    {SeatPosition.TWO, maleAthletes.get(17).getId()},
                    {SeatPosition.BOW, maleAthletes.get(13).getId()},
                    {SeatPosition.COX, femaleAthletes.get(25).getId()}});
        // Club 2 — Жени
        createEntry(dish.getId(), club2Id, dF_1x.getId(), 1, femaleAthletes.get(1).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dF_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(1).getId()}, {SeatPosition.BOW, femaleAthletes.get(5).getId()}});
        createEntry(dish.getId(), club2Id, dF18_1x.getId(), 1, femaleAthletes.get(13).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dF16_1x.getId(), 1, femaleAthletes.get(17).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dF14_1x.getId(), 1, femaleAthletes.get(21).getId(), SeatPosition.STROKE);
        // Club 2 — Смесени (Mixed)
        createEntry(dish.getId(), club2Id, dMix_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(1).getId()}, {SeatPosition.BOW, femaleAthletes.get(1).getId()}});
        createEntry(dish.getId(), club2Id, dMix_2p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(5).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(5).getId()},
                    {SeatPosition.COX, femaleAthletes.get(9).getId()}});
        createEntry(dish.getId(), club2Id, dMix18_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(13).getId()}, {SeatPosition.BOW, femaleAthletes.get(13).getId()}});

        // Club 3 (ГКП) — Мъже
        createEntry(dish.getId(), club3Id, dM_1x.getId(), 1, maleAthletes.get(2).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(2).getId()}, {SeatPosition.BOW, maleAthletes.get(6).getId()}});
        createEntry(dish.getId(), club3Id, dM_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(2).getId()}, {SeatPosition.BOW, maleAthletes.get(6).getId()}});
        // Club 3 — М18, М16, М14, М12
        createEntry(dish.getId(), club3Id, dM18_1x.getId(), 1, maleAthletes.get(10).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM18_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(10).getId()}, {SeatPosition.BOW, maleAthletes.get(14).getId()}});
        // М18 4+ (coxed four with transfer from М16): rowers [10],[14],[18],[22]; cox [26]
        createEntry(dish.getId(), club3Id, dM18_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(10).getId()},
                    {SeatPosition.THREE, maleAthletes.get(14).getId()},
                    {SeatPosition.TWO, maleAthletes.get(18).getId()},
                    {SeatPosition.BOW, maleAthletes.get(22).getId()},
                    {SeatPosition.COX, maleAthletes.get(26).getId()}});
        createEntry(dish.getId(), club3Id, dM16_1x.getId(), 1, maleAthletes.get(14).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM14_1x.getId(), 1, maleAthletes.get(18).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM14_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(18).getId()}, {SeatPosition.BOW, maleAthletes.get(22).getId()}});
        createEntry(dish.getId(), club3Id, dM12_1x.getId(), 1, maleAthletes.get(22).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM12_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(22).getId()}, {SeatPosition.BOW, maleAthletes.get(26).getId()}});
        // М 2+ (coxed pair): [2]+[6] + cox [18]
        createEntry(dish.getId(), club3Id, dM_2p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(2).getId()},
                    {SeatPosition.BOW, maleAthletes.get(6).getId()},
                    {SeatPosition.COX, maleAthletes.get(18).getId()}});
        // М14 4x+ (coxed quad): [18],[22],[26] + [14] + cox [femaleAthletes.get(22)]
        createEntry(dish.getId(), club3Id, dM14_4xp.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(18).getId()},
                    {SeatPosition.THREE, maleAthletes.get(22).getId()},
                    {SeatPosition.TWO, maleAthletes.get(26).getId()},
                    {SeatPosition.BOW, maleAthletes.get(14).getId()},
                    {SeatPosition.COX, femaleAthletes.get(22).getId()}});
        // Club 3 — Жени
        createEntry(dish.getId(), club3Id, dF_1x.getId(), 1, femaleAthletes.get(2).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF_1x.getId(), 2, femaleAthletes.get(6).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(2).getId()}, {SeatPosition.BOW, femaleAthletes.get(6).getId()}});
        createEntry(dish.getId(), club3Id, dF18_1x.getId(), 1, femaleAthletes.get(10).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF16_1x.getId(), 1, femaleAthletes.get(14).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF14_1x.getId(), 1, femaleAthletes.get(18).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF12_1x.getId(), 1, femaleAthletes.get(22).getId(), SeatPosition.STROKE);
        // Club 3 — Смесени (Mixed)
        createEntry(dish.getId(), club3Id, dMix_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(2).getId()}, {SeatPosition.BOW, femaleAthletes.get(2).getId()}});

        // Club 4 (ГКР) — Мъже
        createEntry(dish.getId(), club4Id, dM_1x.getId(), 1, maleAthletes.get(3).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(3).getId()}, {SeatPosition.BOW, maleAthletes.get(7).getId()}});
        createEntry(dish.getId(), club4Id, dM_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(3).getId()}, {SeatPosition.BOW, maleAthletes.get(7).getId()}});
        // М 4+ (coxed four) — 4 rowers + cox. Rowers: males[3],7; cox: males[19](М14, as cox any age is ok)
        createEntry(dish.getId(), club4Id, dM_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(3).getId()},
                    {SeatPosition.THREE, maleAthletes.get(7).getId()},
                    {SeatPosition.BOW, maleAthletes.get(11).getId()},
                    {SeatPosition.TWO, maleAthletes.get(15).getId()},
                    {SeatPosition.COX, maleAthletes.get(19).getId()}});
        // Club 4 — М18, М16, М14, М12
        createEntry(dish.getId(), club4Id, dM18_1x.getId(), 1, maleAthletes.get(11).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM18_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(11).getId()}, {SeatPosition.BOW, maleAthletes.get(15).getId()}});
        createEntry(dish.getId(), club4Id, dM16_1x.getId(), 1, maleAthletes.get(15).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM16_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(15).getId()}, {SeatPosition.BOW, maleAthletes.get(19).getId()}});
        createEntry(dish.getId(), club4Id, dM14_1x.getId(), 1, maleAthletes.get(19).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM14_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(19).getId()}, {SeatPosition.BOW, maleAthletes.get(23).getId()}});
        // М14 4x+ (coxed quad): [19],[23],[27],[15] + cox [femaleAthletes.get(27)]
        createEntry(dish.getId(), club4Id, dM14_4xp.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(19).getId()},
                    {SeatPosition.THREE, maleAthletes.get(23).getId()},
                    {SeatPosition.TWO, maleAthletes.get(27).getId()},
                    {SeatPosition.BOW, maleAthletes.get(15).getId()},
                    {SeatPosition.COX, femaleAthletes.get(27).getId()}});
        createEntry(dish.getId(), club4Id, dM12_1x.getId(), 1, maleAthletes.get(23).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM12_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(23).getId()}, {SeatPosition.BOW, maleAthletes.get(27).getId()}});
        // Club 4 — Жени
        createEntry(dish.getId(), club4Id, dF_1x.getId(), 1, femaleAthletes.get(3).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(3).getId()}, {SeatPosition.BOW, femaleAthletes.get(7).getId()}});
        createEntry(dish.getId(), club4Id, dF18_1x.getId(), 1, femaleAthletes.get(11).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF16_1x.getId(), 1, femaleAthletes.get(15).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF14_1x.getId(), 1, femaleAthletes.get(19).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF12_1x.getId(), 1, femaleAthletes.get(23).getId(), SeatPosition.STROKE);

        // ── Additional bulk entries — 2nd teams + missing disciplines ──────────
        // Athletes per club (by index % 4):
        //   club2 (idx 1): 1,5,9,13,17,21,25,29   club3 (idx 2): 2,6,10,14,18,22,26
        //   club4 (idx 3): 3,7,11,15,19,23,27
        // Age groups: Senior 19+ (0-9,28-29), M18 (10-13), M16 (14-17), M14 (18-21), M12 (22-27)

        // ── Senior 2nd teams — 1x (club2 team2 already exists via idx29, add club3/4 team2) ──
        createEntry(dish.getId(), club3Id, dM_1x.getId(), 2, maleAthletes.get(6).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM_1x.getId(), 2, maleAthletes.get(7).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF_1x.getId(), 3, femaleAthletes.get(10).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF_1x.getId(), 2, femaleAthletes.get(7).getId(), SeatPosition.STROKE);

        // ── Senior 2x — 2nd teams ──
        createEntry(dish.getId(), club2Id, dM_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(9).getId()}, {SeatPosition.BOW, maleAthletes.get(29).getId()}});
        createEntry(dish.getId(), club3Id, dM_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(6).getId()}, {SeatPosition.BOW, maleAthletes.get(10).getId()}});
        createEntry(dish.getId(), club4Id, dM_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(7).getId()}, {SeatPosition.BOW, maleAthletes.get(11).getId()}});
        createEntry(dish.getId(), club2Id, dF_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(5).getId()}, {SeatPosition.BOW, femaleAthletes.get(9).getId()}});
        createEntry(dish.getId(), club3Id, dF_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(6).getId()}, {SeatPosition.BOW, femaleAthletes.get(10).getId()}});
        createEntry(dish.getId(), club4Id, dF_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(7).getId()}, {SeatPosition.BOW, femaleAthletes.get(3).getId()}});

        // ── Senior 2- (pair) — 2nd teams + club2 additional ──
        createEntry(dish.getId(), club2Id, dM_2m.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(5).getId()}, {SeatPosition.BOW, maleAthletes.get(1).getId()}});
        createEntry(dish.getId(), club3Id, dM_2m.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(6).getId()}, {SeatPosition.BOW, maleAthletes.get(10).getId()}});
        createEntry(dish.getId(), club4Id, dM_2m.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(7).getId()}, {SeatPosition.BOW, maleAthletes.get(11).getId()}});
        // Female 2-
        createEntry(dish.getId(), club2Id, dF_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(1).getId()}, {SeatPosition.BOW, femaleAthletes.get(5).getId()}});
        createEntry(dish.getId(), club3Id, dF_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(2).getId()}, {SeatPosition.BOW, femaleAthletes.get(6).getId()}});
        createEntry(dish.getId(), club4Id, dF_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(3).getId()}, {SeatPosition.BOW, femaleAthletes.get(7).getId()}});

        // ── Senior 2+ (coxed pair) — club3 team2, club4 teams ──
        createEntry(dish.getId(), club3Id, dM_2p.getId(), 2,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(6).getId()},
                    {SeatPosition.BOW, maleAthletes.get(10).getId()},
                    {SeatPosition.COX, maleAthletes.get(22).getId()}});
        createEntry(dish.getId(), club4Id, dM_2p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(3).getId()},
                    {SeatPosition.BOW, maleAthletes.get(7).getId()},
                    {SeatPosition.COX, maleAthletes.get(19).getId()}});

        // ── Senior 4x (quad) ──
        createEntry(dish.getId(), club2Id, dM_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(1).getId()},
                    {SeatPosition.THREE, maleAthletes.get(5).getId()},
                    {SeatPosition.TWO, maleAthletes.get(9).getId()},
                    {SeatPosition.BOW, maleAthletes.get(29).getId()}});
        createEntry(dish.getId(), club3Id, dM_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(2).getId()},
                    {SeatPosition.THREE, maleAthletes.get(6).getId()},
                    {SeatPosition.TWO, maleAthletes.get(10).getId()},
                    {SeatPosition.BOW, maleAthletes.get(14).getId()}});
        createEntry(dish.getId(), club4Id, dM_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(3).getId()},
                    {SeatPosition.THREE, maleAthletes.get(7).getId()},
                    {SeatPosition.TWO, maleAthletes.get(11).getId()},
                    {SeatPosition.BOW, maleAthletes.get(15).getId()}});
        // Female 4x
        createEntry(dish.getId(), club2Id, dF_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(1).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(5).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(9).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(29).getId()}});
        createEntry(dish.getId(), club3Id, dF_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(2).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(6).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(10).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(14).getId()}});
        createEntry(dish.getId(), club4Id, dF_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(3).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(7).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(11).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(15).getId()}});

        // ── Senior 4- (four) ──
        createEntry(dish.getId(), club2Id, dM_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(1).getId()},
                    {SeatPosition.THREE, maleAthletes.get(5).getId()},
                    {SeatPosition.TWO, maleAthletes.get(9).getId()},
                    {SeatPosition.BOW, maleAthletes.get(29).getId()}});
        createEntry(dish.getId(), club3Id, dM_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(2).getId()},
                    {SeatPosition.THREE, maleAthletes.get(6).getId()},
                    {SeatPosition.TWO, maleAthletes.get(10).getId()},
                    {SeatPosition.BOW, maleAthletes.get(14).getId()}});
        createEntry(dish.getId(), club4Id, dM_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(3).getId()},
                    {SeatPosition.THREE, maleAthletes.get(7).getId()},
                    {SeatPosition.TWO, maleAthletes.get(11).getId()},
                    {SeatPosition.BOW, maleAthletes.get(15).getId()}});
        // Female 4-
        createEntry(dish.getId(), club2Id, dF_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(1).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(5).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(9).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(29).getId()}});
        createEntry(dish.getId(), club3Id, dF_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(2).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(6).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(10).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(14).getId()}});
        createEntry(dish.getId(), club4Id, dF_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(3).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(7).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(11).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(15).getId()}});

        // ── Senior 4+ (coxed four) — club2, club3 (club4 already has one) ──
        createEntry(dish.getId(), club2Id, dM_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(1).getId()},
                    {SeatPosition.THREE, maleAthletes.get(5).getId()},
                    {SeatPosition.TWO, maleAthletes.get(9).getId()},
                    {SeatPosition.BOW, maleAthletes.get(29).getId()},
                    {SeatPosition.COX, femaleAthletes.get(1).getId()}});
        createEntry(dish.getId(), club3Id, dM_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(2).getId()},
                    {SeatPosition.THREE, maleAthletes.get(6).getId()},
                    {SeatPosition.TWO, maleAthletes.get(10).getId()},
                    {SeatPosition.BOW, maleAthletes.get(14).getId()},
                    {SeatPosition.COX, femaleAthletes.get(2).getId()}});

        // ── Senior 8+ (eight) — 8 rowers + cox ──
        createEntry(dish.getId(), club2Id, dM_8p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(1).getId()},
                    {SeatPosition.SEVEN, maleAthletes.get(5).getId()},
                    {SeatPosition.SIX, maleAthletes.get(9).getId()},
                    {SeatPosition.FIVE, maleAthletes.get(13).getId()},
                    {SeatPosition.FOUR, maleAthletes.get(17).getId()},
                    {SeatPosition.THREE, maleAthletes.get(21).getId()},
                    {SeatPosition.TWO, maleAthletes.get(25).getId()},
                    {SeatPosition.BOW, maleAthletes.get(29).getId()},
                    {SeatPosition.COX, femaleAthletes.get(1).getId()}});
        // Female 8+
        createEntry(dish.getId(), club2Id, dF_8p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(1).getId()},
                    {SeatPosition.SEVEN, femaleAthletes.get(5).getId()},
                    {SeatPosition.SIX, femaleAthletes.get(9).getId()},
                    {SeatPosition.FIVE, femaleAthletes.get(13).getId()},
                    {SeatPosition.FOUR, femaleAthletes.get(17).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(21).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(25).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(29).getId()},
                    {SeatPosition.COX, maleAthletes.get(1).getId()}});

        // ── LK disciplines — Senior ──
        createEntry(dish.getId(), club2Id, dMLK_1x.getId(), 1, maleAthletes.get(1).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dMLK_1x.getId(), 1, maleAthletes.get(2).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dMLK_1x.getId(), 1, maleAthletes.get(3).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dMLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(1).getId()}, {SeatPosition.BOW, maleAthletes.get(5).getId()}});
        createEntry(dish.getId(), club3Id, dMLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(2).getId()}, {SeatPosition.BOW, maleAthletes.get(6).getId()}});
        createEntry(dish.getId(), club4Id, dMLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(3).getId()}, {SeatPosition.BOW, maleAthletes.get(7).getId()}});
        createEntry(dish.getId(), club2Id, dMLK_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(1).getId()}, {SeatPosition.BOW, maleAthletes.get(5).getId()}});
        createEntry(dish.getId(), club3Id, dMLK_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(2).getId()}, {SeatPosition.BOW, maleAthletes.get(6).getId()}});
        createEntry(dish.getId(), club4Id, dMLK_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(3).getId()}, {SeatPosition.BOW, maleAthletes.get(7).getId()}});
        // dMLK_4m — intentionally left without entries (0-entry test case)
        createEntry(dish.getId(), club2Id, dFLK_1x.getId(), 1, femaleAthletes.get(1).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dFLK_1x.getId(), 1, femaleAthletes.get(2).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dFLK_1x.getId(), 1, femaleAthletes.get(3).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dFLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(1).getId()}, {SeatPosition.BOW, femaleAthletes.get(5).getId()}});
        createEntry(dish.getId(), club3Id, dFLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(2).getId()}, {SeatPosition.BOW, femaleAthletes.get(6).getId()}});
        createEntry(dish.getId(), club4Id, dFLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(3).getId()}, {SeatPosition.BOW, femaleAthletes.get(7).getId()}});

        // ── М18 LK ──
        createEntry(dish.getId(), club2Id, dM18LK_1x.getId(), 1, maleAthletes.get(13).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM18LK_1x.getId(), 1, maleAthletes.get(10).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM18LK_1x.getId(), 1, maleAthletes.get(11).getId(), SeatPosition.STROKE);
        // dM18LK_2m — intentionally left without entries (0-entry test case)
        // dF18LK_1x — intentionally left without entries (0-entry test case)

        // ── М18 — 2nd teams + missing disciplines ──
        createEntry(dish.getId(), club2Id, dM18_1x.getId(), 2, maleAthletes.get(9).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM18_1x.getId(), 2, maleAthletes.get(14).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM18_1x.getId(), 2, maleAthletes.get(15).getId(), SeatPosition.STROKE);
        // М18 2x — 2nd teams (club3 already has 1, club2 has none besides 1x)
        createEntry(dish.getId(), club2Id, dM18_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(13).getId()}, {SeatPosition.BOW, maleAthletes.get(9).getId()}});
        createEntry(dish.getId(), club4Id, dM18_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(15).getId()}, {SeatPosition.BOW, maleAthletes.get(19).getId()}});
        // М18 2-
        createEntry(dish.getId(), club2Id, dM18_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(13).getId()}, {SeatPosition.BOW, maleAthletes.get(9).getId()}});
        createEntry(dish.getId(), club3Id, dM18_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(10).getId()}, {SeatPosition.BOW, maleAthletes.get(14).getId()}});
        createEntry(dish.getId(), club4Id, dM18_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(11).getId()}, {SeatPosition.BOW, maleAthletes.get(15).getId()}});
        // М18 2+ (coxed pair)
        createEntry(dish.getId(), club2Id, dM18_2p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(13).getId()},
                    {SeatPosition.BOW, maleAthletes.get(9).getId()},
                    {SeatPosition.COX, femaleAthletes.get(13).getId()}});
        createEntry(dish.getId(), club3Id, dM18_2p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(10).getId()},
                    {SeatPosition.BOW, maleAthletes.get(14).getId()},
                    {SeatPosition.COX, femaleAthletes.get(10).getId()}});
        createEntry(dish.getId(), club4Id, dM18_2p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(11).getId()},
                    {SeatPosition.BOW, maleAthletes.get(15).getId()},
                    {SeatPosition.COX, femaleAthletes.get(11).getId()}});
        // М18 4x (quad)
        createEntry(dish.getId(), club2Id, dM18_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(13).getId()},
                    {SeatPosition.THREE, maleAthletes.get(9).getId()},
                    {SeatPosition.TWO, maleAthletes.get(5).getId()},
                    {SeatPosition.BOW, maleAthletes.get(1).getId()}});
        createEntry(dish.getId(), club3Id, dM18_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(10).getId()},
                    {SeatPosition.THREE, maleAthletes.get(14).getId()},
                    {SeatPosition.TWO, maleAthletes.get(6).getId()},
                    {SeatPosition.BOW, maleAthletes.get(2).getId()}});
        createEntry(dish.getId(), club4Id, dM18_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(11).getId()},
                    {SeatPosition.THREE, maleAthletes.get(15).getId()},
                    {SeatPosition.TWO, maleAthletes.get(7).getId()},
                    {SeatPosition.BOW, maleAthletes.get(3).getId()}});
        // М18 4- (four)
        createEntry(dish.getId(), club2Id, dM18_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(13).getId()},
                    {SeatPosition.THREE, maleAthletes.get(9).getId()},
                    {SeatPosition.TWO, maleAthletes.get(5).getId()},
                    {SeatPosition.BOW, maleAthletes.get(1).getId()}});
        createEntry(dish.getId(), club3Id, dM18_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(10).getId()},
                    {SeatPosition.THREE, maleAthletes.get(14).getId()},
                    {SeatPosition.TWO, maleAthletes.get(6).getId()},
                    {SeatPosition.BOW, maleAthletes.get(2).getId()}});
        createEntry(dish.getId(), club4Id, dM18_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(11).getId()},
                    {SeatPosition.THREE, maleAthletes.get(15).getId()},
                    {SeatPosition.TWO, maleAthletes.get(7).getId()},
                    {SeatPosition.BOW, maleAthletes.get(3).getId()}});
        // М18 4+ (coxed four) — club2, club4 (club3 already has one)
        createEntry(dish.getId(), club2Id, dM18_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(13).getId()},
                    {SeatPosition.THREE, maleAthletes.get(9).getId()},
                    {SeatPosition.TWO, maleAthletes.get(5).getId()},
                    {SeatPosition.BOW, maleAthletes.get(1).getId()},
                    {SeatPosition.COX, femaleAthletes.get(1).getId()}});
        createEntry(dish.getId(), club4Id, dM18_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(11).getId()},
                    {SeatPosition.THREE, maleAthletes.get(15).getId()},
                    {SeatPosition.TWO, maleAthletes.get(7).getId()},
                    {SeatPosition.BOW, maleAthletes.get(3).getId()},
                    {SeatPosition.COX, femaleAthletes.get(3).getId()}});
        // М18 8+
        createEntry(dish.getId(), club2Id, dM18_8p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(13).getId()},
                    {SeatPosition.SEVEN, maleAthletes.get(9).getId()},
                    {SeatPosition.SIX, maleAthletes.get(5).getId()},
                    {SeatPosition.FIVE, maleAthletes.get(1).getId()},
                    {SeatPosition.FOUR, maleAthletes.get(17).getId()},
                    {SeatPosition.THREE, maleAthletes.get(21).getId()},
                    {SeatPosition.TWO, maleAthletes.get(25).getId()},
                    {SeatPosition.BOW, maleAthletes.get(29).getId()},
                    {SeatPosition.COX, femaleAthletes.get(13).getId()}});

        // ── Ж18 — entries for all clubs ──
        createEntry(dish.getId(), club2Id, dF18_1x.getId(), 2, femaleAthletes.get(9).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF18_1x.getId(), 2, femaleAthletes.get(14).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF18_1x.getId(), 2, femaleAthletes.get(15).getId(), SeatPosition.STROKE);
        // Ж18 2x
        createEntry(dish.getId(), club2Id, dF18_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(13).getId()}, {SeatPosition.BOW, femaleAthletes.get(9).getId()}});
        createEntry(dish.getId(), club3Id, dF18_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(10).getId()}, {SeatPosition.BOW, femaleAthletes.get(14).getId()}});
        createEntry(dish.getId(), club4Id, dF18_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(11).getId()}, {SeatPosition.BOW, femaleAthletes.get(15).getId()}});
        // Ж18 2-
        createEntry(dish.getId(), club2Id, dF18_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(13).getId()}, {SeatPosition.BOW, femaleAthletes.get(9).getId()}});
        createEntry(dish.getId(), club3Id, dF18_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(10).getId()}, {SeatPosition.BOW, femaleAthletes.get(14).getId()}});
        createEntry(dish.getId(), club4Id, dF18_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(11).getId()}, {SeatPosition.BOW, femaleAthletes.get(15).getId()}});
        // Ж18 4x
        createEntry(dish.getId(), club2Id, dF18_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(13).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(9).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(5).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(1).getId()}});
        createEntry(dish.getId(), club3Id, dF18_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(10).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(14).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(6).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(2).getId()}});
        createEntry(dish.getId(), club4Id, dF18_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(11).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(15).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(7).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(3).getId()}});
        // Ж18 4-
        createEntry(dish.getId(), club2Id, dF18_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(13).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(9).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(5).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(1).getId()}});
        createEntry(dish.getId(), club3Id, dF18_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(10).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(14).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(6).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(2).getId()}});
        createEntry(dish.getId(), club4Id, dF18_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(11).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(15).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(7).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(3).getId()}});
        // Ж18 8+
        createEntry(dish.getId(), club2Id, dF18_8p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(13).getId()},
                    {SeatPosition.SEVEN, femaleAthletes.get(9).getId()},
                    {SeatPosition.SIX, femaleAthletes.get(5).getId()},
                    {SeatPosition.FIVE, femaleAthletes.get(1).getId()},
                    {SeatPosition.FOUR, femaleAthletes.get(17).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(21).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(25).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(29).getId()},
                    {SeatPosition.COX, maleAthletes.get(13).getId()}});

        // ── М16 — 2nd teams + missing disciplines ──
        createEntry(dish.getId(), club2Id, dM16_1x.getId(), 2, maleAthletes.get(13).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM16_1x.getId(), 2, maleAthletes.get(18).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM16_1x.getId(), 2, maleAthletes.get(19).getId(), SeatPosition.STROKE);
        // М16 2x — 2nd teams
        createEntry(dish.getId(), club2Id, dM16_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(17).getId()}, {SeatPosition.BOW, maleAthletes.get(13).getId()}});
        createEntry(dish.getId(), club3Id, dM16_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(14).getId()}, {SeatPosition.BOW, maleAthletes.get(18).getId()}});
        createEntry(dish.getId(), club4Id, dM16_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(19).getId()}, {SeatPosition.BOW, maleAthletes.get(23).getId()}});
        // М16 2-
        createEntry(dish.getId(), club2Id, dM16_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(17).getId()}, {SeatPosition.BOW, maleAthletes.get(13).getId()}});
        createEntry(dish.getId(), club3Id, dM16_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(14).getId()}, {SeatPosition.BOW, maleAthletes.get(18).getId()}});
        createEntry(dish.getId(), club4Id, dM16_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(15).getId()}, {SeatPosition.BOW, maleAthletes.get(19).getId()}});
        // М16 4x
        createEntry(dish.getId(), club2Id, dM16_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(17).getId()},
                    {SeatPosition.THREE, maleAthletes.get(13).getId()},
                    {SeatPosition.TWO, maleAthletes.get(21).getId()},
                    {SeatPosition.BOW, maleAthletes.get(25).getId()}});
        createEntry(dish.getId(), club3Id, dM16_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(14).getId()},
                    {SeatPosition.THREE, maleAthletes.get(18).getId()},
                    {SeatPosition.TWO, maleAthletes.get(22).getId()},
                    {SeatPosition.BOW, maleAthletes.get(26).getId()}});
        createEntry(dish.getId(), club4Id, dM16_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(15).getId()},
                    {SeatPosition.THREE, maleAthletes.get(19).getId()},
                    {SeatPosition.TWO, maleAthletes.get(23).getId()},
                    {SeatPosition.BOW, maleAthletes.get(27).getId()}});
        // М16 4-
        createEntry(dish.getId(), club2Id, dM16_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(17).getId()},
                    {SeatPosition.THREE, maleAthletes.get(13).getId()},
                    {SeatPosition.TWO, maleAthletes.get(21).getId()},
                    {SeatPosition.BOW, maleAthletes.get(25).getId()}});
        createEntry(dish.getId(), club3Id, dM16_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(14).getId()},
                    {SeatPosition.THREE, maleAthletes.get(18).getId()},
                    {SeatPosition.TWO, maleAthletes.get(22).getId()},
                    {SeatPosition.BOW, maleAthletes.get(26).getId()}});
        createEntry(dish.getId(), club4Id, dM16_4m.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(15).getId()},
                    {SeatPosition.THREE, maleAthletes.get(19).getId()},
                    {SeatPosition.TWO, maleAthletes.get(23).getId()},
                    {SeatPosition.BOW, maleAthletes.get(27).getId()}});
        // М16 4+ (coxed four)
        createEntry(dish.getId(), club2Id, dM16_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(17).getId()},
                    {SeatPosition.THREE, maleAthletes.get(13).getId()},
                    {SeatPosition.TWO, maleAthletes.get(21).getId()},
                    {SeatPosition.BOW, maleAthletes.get(25).getId()},
                    {SeatPosition.COX, femaleAthletes.get(17).getId()}});
        createEntry(dish.getId(), club3Id, dM16_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(14).getId()},
                    {SeatPosition.THREE, maleAthletes.get(18).getId()},
                    {SeatPosition.TWO, maleAthletes.get(22).getId()},
                    {SeatPosition.BOW, maleAthletes.get(26).getId()},
                    {SeatPosition.COX, femaleAthletes.get(14).getId()}});
        createEntry(dish.getId(), club4Id, dM16_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(15).getId()},
                    {SeatPosition.THREE, maleAthletes.get(19).getId()},
                    {SeatPosition.TWO, maleAthletes.get(23).getId()},
                    {SeatPosition.BOW, maleAthletes.get(27).getId()},
                    {SeatPosition.COX, femaleAthletes.get(15).getId()}});
        // М16 8+
        createEntry(dish.getId(), club2Id, dM16_8p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(17).getId()},
                    {SeatPosition.SEVEN, maleAthletes.get(13).getId()},
                    {SeatPosition.SIX, maleAthletes.get(21).getId()},
                    {SeatPosition.FIVE, maleAthletes.get(25).getId()},
                    {SeatPosition.FOUR, maleAthletes.get(9).getId()},
                    {SeatPosition.THREE, maleAthletes.get(5).getId()},
                    {SeatPosition.TWO, maleAthletes.get(1).getId()},
                    {SeatPosition.BOW, maleAthletes.get(29).getId()},
                    {SeatPosition.COX, femaleAthletes.get(17).getId()}});

        // ── Ж16 — entries for all clubs ──
        createEntry(dish.getId(), club2Id, dF16_1x.getId(), 2, femaleAthletes.get(13).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF16_1x.getId(), 2, femaleAthletes.get(18).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF16_1x.getId(), 2, femaleAthletes.get(19).getId(), SeatPosition.STROKE);
        // Ж16 2x
        createEntry(dish.getId(), club2Id, dF16_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(17).getId()}, {SeatPosition.BOW, femaleAthletes.get(13).getId()}});
        createEntry(dish.getId(), club3Id, dF16_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(14).getId()}, {SeatPosition.BOW, femaleAthletes.get(18).getId()}});
        createEntry(dish.getId(), club4Id, dF16_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(15).getId()}, {SeatPosition.BOW, femaleAthletes.get(19).getId()}});
        // Ж16 2-
        createEntry(dish.getId(), club2Id, dF16_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(17).getId()}, {SeatPosition.BOW, femaleAthletes.get(13).getId()}});
        createEntry(dish.getId(), club3Id, dF16_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(14).getId()}, {SeatPosition.BOW, femaleAthletes.get(18).getId()}});
        createEntry(dish.getId(), club4Id, dF16_2m.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(15).getId()}, {SeatPosition.BOW, femaleAthletes.get(19).getId()}});
        // Ж16 4x
        createEntry(dish.getId(), club2Id, dF16_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(17).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(13).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(21).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(25).getId()}});
        createEntry(dish.getId(), club3Id, dF16_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(14).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(18).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(22).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(26).getId()}});
        createEntry(dish.getId(), club4Id, dF16_4x.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(15).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(19).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(23).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(27).getId()}});
        // Ж16 8+
        createEntry(dish.getId(), club2Id, dF16_8p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(17).getId()},
                    {SeatPosition.SEVEN, femaleAthletes.get(13).getId()},
                    {SeatPosition.SIX, femaleAthletes.get(21).getId()},
                    {SeatPosition.FIVE, femaleAthletes.get(25).getId()},
                    {SeatPosition.FOUR, femaleAthletes.get(9).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(5).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(1).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(29).getId()},
                    {SeatPosition.COX, maleAthletes.get(17).getId()}});

        // ── М14 — 2nd teams + missing disciplines ──
        createEntry(dish.getId(), club2Id, dM14_1x.getId(), 2, maleAthletes.get(25).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM14_1x.getId(), 2, maleAthletes.get(22).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM14_1x.getId(), 2, maleAthletes.get(23).getId(), SeatPosition.STROKE);
        // М14 2x — 2nd teams (club3,4 already have 1)
        createEntry(dish.getId(), club2Id, dM14_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(21).getId()}, {SeatPosition.BOW, maleAthletes.get(25).getId()}});
        createEntry(dish.getId(), club3Id, dM14_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(22).getId()}, {SeatPosition.BOW, maleAthletes.get(26).getId()}});
        createEntry(dish.getId(), club4Id, dM14_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(23).getId()}, {SeatPosition.BOW, maleAthletes.get(27).getId()}});

        // ── Ж14 — 2nd teams + missing disciplines ──
        createEntry(dish.getId(), club2Id, dF14_1x.getId(), 2, femaleAthletes.get(25).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF14_1x.getId(), 2, femaleAthletes.get(22).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF14_1x.getId(), 2, femaleAthletes.get(23).getId(), SeatPosition.STROKE);
        // Ж14 2x
        createEntry(dish.getId(), club2Id, dF14_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(21).getId()}, {SeatPosition.BOW, femaleAthletes.get(25).getId()}});
        createEntry(dish.getId(), club3Id, dF14_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(18).getId()}, {SeatPosition.BOW, femaleAthletes.get(22).getId()}});
        createEntry(dish.getId(), club4Id, dF14_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(19).getId()}, {SeatPosition.BOW, femaleAthletes.get(23).getId()}});
        // Ж14 4x+ (coxed quad)
        createEntry(dish.getId(), club2Id, dF14_4xp.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(21).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(25).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(17).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(13).getId()},
                    {SeatPosition.COX, maleAthletes.get(25).getId()}});
        createEntry(dish.getId(), club3Id, dF14_4xp.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(18).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(22).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(26).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(14).getId()},
                    {SeatPosition.COX, maleAthletes.get(22).getId()}});
        createEntry(dish.getId(), club4Id, dF14_4xp.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, femaleAthletes.get(19).getId()},
                    {SeatPosition.THREE, femaleAthletes.get(23).getId()},
                    {SeatPosition.TWO, femaleAthletes.get(27).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(15).getId()},
                    {SeatPosition.COX, maleAthletes.get(23).getId()}});

        // ── М12 — 2nd teams + 2x ──
        createEntry(dish.getId(), club2Id, dM12_1x.getId(), 2, maleAthletes.get(21).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM12_1x.getId(), 2, maleAthletes.get(26).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM12_1x.getId(), 2, maleAthletes.get(27).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dM12_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(25).getId()}, {SeatPosition.BOW, maleAthletes.get(29).getId()}});
        // Club3 M12 2x already exists

        // ── Ж12 — all clubs ──
        createEntry(dish.getId(), club2Id, dF12_1x.getId(), 1, femaleAthletes.get(25).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF12_1x.getId(), 2, femaleAthletes.get(26).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF12_1x.getId(), 2, femaleAthletes.get(27).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dF12_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(25).getId()}, {SeatPosition.BOW, femaleAthletes.get(21).getId()}});
        createEntry(dish.getId(), club3Id, dF12_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(22).getId()}, {SeatPosition.BOW, femaleAthletes.get(26).getId()}});
        createEntry(dish.getId(), club4Id, dF12_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(23).getId()}, {SeatPosition.BOW, femaleAthletes.get(27).getId()}});

        // ── Mixed — 2nd teams + club4 ──
        createEntry(dish.getId(), club2Id, dMix_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(5).getId()}, {SeatPosition.BOW, femaleAthletes.get(5).getId()}});
        createEntry(dish.getId(), club4Id, dMix_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(3).getId()}, {SeatPosition.BOW, femaleAthletes.get(3).getId()}});
        createEntry(dish.getId(), club4Id, dMix_2p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(7).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(7).getId()},
                    {SeatPosition.COX, femaleAthletes.get(11).getId()}});
        createEntry(dish.getId(), club3Id, dMix_2p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(6).getId()},
                    {SeatPosition.BOW, femaleAthletes.get(6).getId()},
                    {SeatPosition.COX, femaleAthletes.get(10).getId()}});
        // Mixed 18
        createEntry(dish.getId(), club3Id, dMix18_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(10).getId()}, {SeatPosition.BOW, femaleAthletes.get(10).getId()}});
        createEntry(dish.getId(), club4Id, dMix18_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(11).getId()}, {SeatPosition.BOW, femaleAthletes.get(11).getId()}});

        // ══════════════════════════════════════════════════════════════════════
        // Club 1 entries + extra teams for high-entry-count disciplines
        // ══════════════════════════════════════════════════════════════════════

        // ── Club 1 (ЛКГ) — basic entries for all 1x disciplines ──
        // Senior M 1x (3 teams)
        createEntry(dish.getId(), club1Id, dM_1x.getId(), 1, maleAthletes.get(0).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dM_1x.getId(), 2, maleAthletes.get(4).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dM_1x.getId(), 3, maleAthletes.get(8).getId(), SeatPosition.STROKE);
        // Senior F 1x (3 teams)
        createEntry(dish.getId(), club1Id, dF_1x.getId(), 1, femaleAthletes.get(0).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dF_1x.getId(), 2, femaleAthletes.get(4).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dF_1x.getId(), 3, femaleAthletes.get(8).getId(), SeatPosition.STROKE);
        // Senior M 2x
        createEntry(dish.getId(), club1Id, dM_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(0).getId()}, {SeatPosition.BOW, maleAthletes.get(4).getId()}});
        createEntry(dish.getId(), club1Id, dM_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(8).getId()}, {SeatPosition.BOW, maleAthletes.get(32).getId()}});
        // Senior F 2x
        createEntry(dish.getId(), club1Id, dF_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(0).getId()}, {SeatPosition.BOW, femaleAthletes.get(4).getId()}});
        createEntry(dish.getId(), club1Id, dF_2x.getId(), 2,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(8).getId()}, {SeatPosition.BOW, femaleAthletes.get(32).getId()}});
        // Club 1 — age groups
        createEntry(dish.getId(), club1Id, dM18_1x.getId(), 1, maleAthletes.get(12).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dM16_1x.getId(), 1, maleAthletes.get(16).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dM16_1x.getId(), 2, maleAthletes.get(20).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dM14_1x.getId(), 1, maleAthletes.get(20).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dM12_1x.getId(), 1, maleAthletes.get(24).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dM12_1x.getId(), 2, maleAthletes.get(28).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dF18_1x.getId(), 1, femaleAthletes.get(12).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dF16_1x.getId(), 1, femaleAthletes.get(16).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dF14_1x.getId(), 1, femaleAthletes.get(20).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dF12_1x.getId(), 1, femaleAthletes.get(24).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dF12_1x.getId(), 2, femaleAthletes.get(28).getId(), SeatPosition.STROKE);

        // ── Extra Senior M 1x teams (using new athletes idx 30-39) → total ~21 ──
        createEntry(dish.getId(), club1Id, dM_1x.getId(), 4, maleAthletes.get(32).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dM_1x.getId(), 5, maleAthletes.get(36).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dM_1x.getId(), 3, maleAthletes.get(9).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dM_1x.getId(), 4, maleAthletes.get(33).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dM_1x.getId(), 5, maleAthletes.get(37).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM_1x.getId(), 3, maleAthletes.get(30).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM_1x.getId(), 4, maleAthletes.get(34).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dM_1x.getId(), 5, maleAthletes.get(38).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM_1x.getId(), 3, maleAthletes.get(31).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM_1x.getId(), 4, maleAthletes.get(35).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dM_1x.getId(), 5, maleAthletes.get(39).getId(), SeatPosition.STROKE);

        // ── Extra Senior F 1x teams → total ~21 ──
        createEntry(dish.getId(), club1Id, dF_1x.getId(), 4, femaleAthletes.get(32).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dF_1x.getId(), 5, femaleAthletes.get(36).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dF_1x.getId(), 2, femaleAthletes.get(5).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dF_1x.getId(), 3, femaleAthletes.get(33).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dF_1x.getId(), 4, femaleAthletes.get(37).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF_1x.getId(), 4, femaleAthletes.get(30).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF_1x.getId(), 5, femaleAthletes.get(34).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF_1x.getId(), 6, femaleAthletes.get(38).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF_1x.getId(), 3, femaleAthletes.get(31).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF_1x.getId(), 4, femaleAthletes.get(35).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF_1x.getId(), 5, femaleAthletes.get(39).getId(), SeatPosition.STROKE);
        // ── Extra Senior F 1x teams → total 28 (4 heats) ──
        createEntry(dish.getId(), club1Id, dF_1x.getId(), 6, femaleAthletes.get(40).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dF_1x.getId(), 5, femaleAthletes.get(41).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF_1x.getId(), 7, femaleAthletes.get(42).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF_1x.getId(), 6, femaleAthletes.get(43).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club1Id, dF_1x.getId(), 7, femaleAthletes.get(44).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club2Id, dF_1x.getId(), 6, femaleAthletes.get(45).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club3Id, dF_1x.getId(), 8, femaleAthletes.get(46).getId(), SeatPosition.STROKE);
        createEntry(dish.getId(), club4Id, dF_1x.getId(), 7, femaleAthletes.get(47).getId(), SeatPosition.STROKE);

        // ── Extra Senior 2x teams → total ~12 each ──
        createEntry(dish.getId(), club2Id, dM_2x.getId(), 3,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(33).getId()}, {SeatPosition.BOW, maleAthletes.get(37).getId()}});
        createEntry(dish.getId(), club3Id, dM_2x.getId(), 3,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(30).getId()}, {SeatPosition.BOW, maleAthletes.get(34).getId()}});
        createEntry(dish.getId(), club4Id, dM_2x.getId(), 3,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(31).getId()}, {SeatPosition.BOW, maleAthletes.get(35).getId()}});
        createEntry(dish.getId(), club2Id, dF_2x.getId(), 3,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(33).getId()}, {SeatPosition.BOW, femaleAthletes.get(37).getId()}});
        createEntry(dish.getId(), club3Id, dF_2x.getId(), 3,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(30).getId()}, {SeatPosition.BOW, femaleAthletes.get(34).getId()}});
        createEntry(dish.getId(), club4Id, dF_2x.getId(), 3,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(31).getId()}, {SeatPosition.BOW, femaleAthletes.get(35).getId()}});

        // 2. Купа София 2026 — younger groups regatta (М14, Ж14, М12, Ж12 + М16, Ж16)
        Competition cupSofia = competitionRepository.save(Competition.builder()
                .shortName("КС2026").name("Купа София 2026")
                .location("София, Панчарево").startDate(LocalDate.of(2026, 6, 6)).endDate(LocalDate.of(2026, 6, 7))
                .awardingCeremonyAt(Instant.parse("2026-06-07T16:00:00Z"))
                .scoringSchemeId(scoringDish.getId()).qualificationSchemeId(qualJunior.getId())
                .competitionType(CompetitionType.NATIONAL_WATER).isTemplate(false).build());

        // Day 1 — Heats
        ttEvent(cupSofia, dM12_1x, H, "2026-06-06T08:00:00Z"); ttEvent(cupSofia, dM12_2x, H, "2026-06-06T08:15:00Z");
        ttEvent(cupSofia, dF12_1x, H, "2026-06-06T08:30:00Z"); ttEvent(cupSofia, dF12_2x, H, "2026-06-06T08:45:00Z");
        ttEvent(cupSofia, dM14_1x, H, "2026-06-06T09:00:00Z"); ttEvent(cupSofia, dM14_2x, H, "2026-06-06T09:15:00Z");
        ttEvent(cupSofia, dM14_4xp, H, "2026-06-06T09:30:00Z");
        ttEvent(cupSofia, dF14_1x, H, "2026-06-06T09:45:00Z"); ttEvent(cupSofia, dF14_2x, H, "2026-06-06T10:00:00Z");
        ttEvent(cupSofia, dF14_4xp, H, "2026-06-06T10:15:00Z");
        ttEvent(cupSofia, dM16_1x, H, "2026-06-06T10:30:00Z"); ttEvent(cupSofia, dM16_2x, H, "2026-06-06T10:45:00Z");
        ttEvent(cupSofia, dM16_4x, H, "2026-06-06T11:00:00Z");
        ttEvent(cupSofia, dF16_1x, H, "2026-06-06T11:15:00Z"); ttEvent(cupSofia, dF16_2x, H, "2026-06-06T11:30:00Z");
        ttEvent(cupSofia, dF16_4x, H, "2026-06-06T11:45:00Z");
        // Day 2 — Finals
        ttEvent(cupSofia, dM12_1x, FA, "2026-06-07T08:00:00Z"); ttEvent(cupSofia, dM12_2x, FA, "2026-06-07T08:15:00Z");
        ttEvent(cupSofia, dF12_1x, FA, "2026-06-07T08:30:00Z"); ttEvent(cupSofia, dF12_2x, FA, "2026-06-07T08:45:00Z");
        ttEvent(cupSofia, dM14_1x, FA, "2026-06-07T09:00:00Z"); ttEvent(cupSofia, dM14_2x, FA, "2026-06-07T09:15:00Z");
        ttEvent(cupSofia, dM14_4xp, FA, "2026-06-07T09:30:00Z");
        ttEvent(cupSofia, dF14_1x, FA, "2026-06-07T09:45:00Z"); ttEvent(cupSofia, dF14_2x, FA, "2026-06-07T10:00:00Z");
        ttEvent(cupSofia, dF14_4xp, FA, "2026-06-07T10:15:00Z");
        ttEvent(cupSofia, dM16_1x, FA, "2026-06-07T10:30:00Z"); ttEvent(cupSofia, dM16_2x, FA, "2026-06-07T10:45:00Z");
        ttEvent(cupSofia, dM16_4x, FA, "2026-06-07T11:00:00Z");
        ttEvent(cupSofia, dF16_1x, FA, "2026-06-07T11:15:00Z"); ttEvent(cupSofia, dF16_2x, FA, "2026-06-07T11:30:00Z");
        ttEvent(cupSofia, dF16_4x, FA, "2026-06-07T11:45:00Z");

        // 3. ДПГЕ 2026 — ergometer championship (all groups, ERGO boat class)
        Competition dpge = competitionRepository.save(Competition.builder()
                .shortName("ДПГЕ2026").name("Държавно първенство на гребен ергометър 2026")
                .location("София, НСА").startDate(LocalDate.of(2026, 3, 15)).endDate(LocalDate.of(2026, 3, 15))
                .awardingCeremonyAt(Instant.parse("2026-03-15T17:00:00Z"))
                .scoringSchemeId(scoringErg.getId()).qualificationSchemeId(qualJunior.getId())
                .competitionType(CompetitionType.ERG).isTemplate(false).build());

        DisciplineDefinition dErgM = disc("Ергометър мъже", "ERG М", gSenior, BoatClass.ERGO, 1, false, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dErgF = disc("Ергометър жени", "ERG Ж", gSenior, BoatClass.ERGO, 1, false, false, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dErgMLK = disc("Ергометър мъже ЛК", "ERG МЛК", gLK, BoatClass.ERGO, 1, false, true, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dErgFLK = disc("Ергометър жени ЛК", "ERG ЖЛК", gLK, BoatClass.ERGO, 1, false, true, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dErgM18 = disc("Ергометър юн. ст.", "ERG М18", g18, BoatClass.ERGO, 1, false, false, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dErgF18 = disc("Ергометър дев. ст.", "ERG Ж18", g18, BoatClass.ERGO, 1, false, false, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dErgM18LK = disc("Ергометър юн. ст. ЛК", "ERG М18ЛК", g18LK, BoatClass.ERGO, 1, false, true, 2000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dErgF18LK = disc("Ергометър дев. ст. ЛК", "ERG Ж18ЛК", g18LK, BoatClass.ERGO, 1, false, true, 2000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dErgM16 = disc("Ергометър юн. мл.", "ERG М16", g16, BoatClass.ERGO, 1, false, false, 1000, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dErgF16 = disc("Ергометър дев. мл.", "ERG Ж16", g16, BoatClass.ERGO, 1, false, false, 1000, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dErgM14 = disc("Ергометър кадети", "ERG М14", g14, BoatClass.ERGO, 1, false, false, 500, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dErgF14 = disc("Ергометър кадетки", "ERG Ж14", g14, BoatClass.ERGO, 1, false, false, 500, 2, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dErgM12 = disc("Ергометър момчета", "ERG М12", g12, BoatClass.ERGO, 1, false, false, 250, 2, 0, DisciplineGender.MALE);
        DisciplineDefinition dErgF12 = disc("Ергометър момичета", "ERG Ж12", g12, BoatClass.ERGO, 1, false, false, 250, 2, 0, DisciplineGender.FEMALE);

        ttEvent(dpge, dErgM, H, "2026-03-15T08:00:00Z"); ttEvent(dpge, dErgF, H, "2026-03-15T08:30:00Z");
        ttEvent(dpge, dErgMLK, H, "2026-03-15T09:00:00Z"); ttEvent(dpge, dErgFLK, H, "2026-03-15T09:30:00Z");
        ttEvent(dpge, dErgM18, H, "2026-03-15T10:00:00Z"); ttEvent(dpge, dErgF18, H, "2026-03-15T10:30:00Z");
        ttEvent(dpge, dErgM18LK, H, "2026-03-15T11:00:00Z"); ttEvent(dpge, dErgF18LK, H, "2026-03-15T11:30:00Z");
        ttEvent(dpge, dErgM16, H, "2026-03-15T12:00:00Z"); ttEvent(dpge, dErgF16, H, "2026-03-15T12:30:00Z");
        ttEvent(dpge, dErgM14, H, "2026-03-15T13:00:00Z"); ttEvent(dpge, dErgF14, H, "2026-03-15T13:30:00Z");
        ttEvent(dpge, dErgM12, H, "2026-03-15T14:00:00Z"); ttEvent(dpge, dErgF12, H, "2026-03-15T14:30:00Z");

        // 4. Template competition
        Competition template = competitionRepository.save(Competition.builder()
                .shortName("ШАБ-ДИШ").name("Шаблон за ДИШ")
                .location("Пловдив, Гребна база").startDate(LocalDate.of(2026, 6, 28)).endDate(LocalDate.of(2026, 6, 29))
                .scoringSchemeId(scoringDish.getId()).qualificationSchemeId(qualSenior.getId())
                .competitionType(CompetitionType.NATIONAL_WATER).isTemplate(true).build());

        ttEvent(template, dM_1x, H, "2026-06-28T09:00:00Z"); ttEvent(template, dF_1x, H, "2026-06-28T10:00:00Z");
        ttEvent(template, dM_8p, H, "2026-06-28T11:00:00Z"); ttEvent(template, dF_8p, H, "2026-06-28T12:00:00Z");

        // ── 4. Weigh-In Test Competition — always TODAY, lightweight + coxed ──
        LocalDate today = LocalDate.now();
        String todayStr = today.toString(); // e.g. "2026-04-30"

        // Special discipline: lightweight coxed four (4+ ЛК) — both rowers AND cox need measuring
        DisciplineDefinition dMLK_4p = disc("Четворка с+ мъже ЛК", "4+ МЛК", gLK, BoatClass.COXED_FOUR, 4, true, true, 2000, 2, 0, DisciplineGender.MALE);

        Competition weighTest = competitionRepository.save(Competition.builder()
                .shortName("ТЕСТ-ТЕГЛО").name("Тест измерване на тегло (" + todayStr + ")")
                .location("Пловдив, Гребна база").startDate(today).endDate(today)
                .entrySubmissionsOpenAt(Instant.now().minus(java.time.Duration.ofDays(7)))
                .entrySubmissionsClosedAt(Instant.now().minus(java.time.Duration.ofDays(1)))
                .lastChangesBeforeTmAt(Instant.now().minus(java.time.Duration.ofDays(1)))
                .technicalMeetingAt(Instant.now().minus(java.time.Duration.ofHours(2)))
                .awardingCeremonyAt(today.atTime(17, 0).toInstant(java.time.ZoneOffset.UTC))
                .scoringSchemeId(scoringDish.getId()).qualificationSchemeId(qualSenior.getId())
                .competitionType(CompetitionType.NATIONAL_WATER).isTemplate(false).build());

        // Events today: lightweight 1x, lightweight 2x, coxed four (4+), lightweight 4- with coxed crew
        String t0800 = todayStr + "T08:00:00Z";
        String t0830 = todayStr + "T08:30:00Z";
        String t0900 = todayStr + "T09:00:00Z";
        String t0930 = todayStr + "T09:30:00Z";
        String t1000 = todayStr + "T10:00:00Z";
        String t1030 = todayStr + "T10:30:00Z";

        // Male lightweight 1x
        ttEvent(weighTest, dMLK_1x, FA, t0800);
        // Male lightweight 2x
        ttEvent(weighTest, dMLK_2x, FA, t0830);
        // Male coxed four (4+) — has cox that needs weighing
        ttEvent(weighTest, dM_4p, FA, t0900);
        // Female lightweight 1x
        ttEvent(weighTest, dFLK_1x, FA, t0930);
        // Female lightweight 2x
        ttEvent(weighTest, dFLK_2x, FA, t1000);
        // Male coxed pair (2+) — has cox
        ttEvent(weighTest, dM_2p, FA, t1030);
        // Male lightweight coxed four (4+ ЛК) — rowers + cox both need weighing
        String t1100 = todayStr + "T11:00:00Z";
        ttEvent(weighTest, dMLK_4p, FA, t1100);

        // Entries for weigh-in test competition
        // MLK 1x — 3 clubs
        createEntry(weighTest.getId(), club2Id, dMLK_1x.getId(), 1, maleAthletes.get(1).getId(), SeatPosition.STROKE);
        createEntry(weighTest.getId(), club3Id, dMLK_1x.getId(), 1, maleAthletes.get(2).getId(), SeatPosition.STROKE);
        createEntry(weighTest.getId(), club4Id, dMLK_1x.getId(), 1, maleAthletes.get(3).getId(), SeatPosition.STROKE);
        // MLK 2x — 2 clubs
        createEntry(weighTest.getId(), club2Id, dMLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(1).getId()}, {SeatPosition.BOW, maleAthletes.get(5).getId()}});
        createEntry(weighTest.getId(), club3Id, dMLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, maleAthletes.get(2).getId()}, {SeatPosition.BOW, maleAthletes.get(6).getId()}});
        // M 4+ (coxed four) — club4: 4 rowers + cox
        createEntry(weighTest.getId(), club4Id, dM_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(3).getId()},
                    {SeatPosition.THREE, maleAthletes.get(7).getId()},
                    {SeatPosition.TWO, maleAthletes.get(11).getId()},
                    {SeatPosition.BOW, maleAthletes.get(15).getId()},
                    {SeatPosition.COX, maleAthletes.get(19).getId()}});
        // FLK 1x — 3 clubs
        createEntry(weighTest.getId(), club2Id, dFLK_1x.getId(), 1, femaleAthletes.get(1).getId(), SeatPosition.STROKE);
        createEntry(weighTest.getId(), club3Id, dFLK_1x.getId(), 1, femaleAthletes.get(2).getId(), SeatPosition.STROKE);
        createEntry(weighTest.getId(), club4Id, dFLK_1x.getId(), 1, femaleAthletes.get(3).getId(), SeatPosition.STROKE);
        // FLK 2x — 2 clubs
        createEntry(weighTest.getId(), club2Id, dFLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(1).getId()}, {SeatPosition.BOW, femaleAthletes.get(5).getId()}});
        createEntry(weighTest.getId(), club3Id, dFLK_2x.getId(), 1,
                new Object[][]{{SeatPosition.STROKE, femaleAthletes.get(2).getId()}, {SeatPosition.BOW, femaleAthletes.get(6).getId()}});
        // M 2+ (coxed pair) — club3: 2 rowers + cox
        createEntry(weighTest.getId(), club3Id, dM_2p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(2).getId()},
                    {SeatPosition.BOW, maleAthletes.get(6).getId()},
                    {SeatPosition.COX, maleAthletes.get(18).getId()}});
        // MLK 4+ (lightweight coxed four) — club2: 4 lightweight rowers + cox (all need weighing)
        createEntry(weighTest.getId(), club2Id, dMLK_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(1).getId()},
                    {SeatPosition.THREE, maleAthletes.get(5).getId()},
                    {SeatPosition.TWO, maleAthletes.get(9).getId()},
                    {SeatPosition.BOW, maleAthletes.get(29).getId()},
                    {SeatPosition.COX, femaleAthletes.get(1).getId()}});
        // MLK 4+ — club3: 4 lightweight rowers + cox
        createEntry(weighTest.getId(), club3Id, dMLK_4p.getId(), 1,
                new Object[][]{
                    {SeatPosition.STROKE, maleAthletes.get(2).getId()},
                    {SeatPosition.THREE, maleAthletes.get(6).getId()},
                    {SeatPosition.TWO, maleAthletes.get(10).getId()},
                    {SeatPosition.BOW, maleAthletes.get(14).getId()},
                    {SeatPosition.COX, femaleAthletes.get(2).getId()}});

        // ══════════════════════════════════════════════════════════════════════
        // 5. ТЕСТ-КЛАСИРАНЕ — Final standings test competition
        //    All phases official, with participations + edge cases (ties, DNF, DNS, DSQ)
        // ══════════════════════════════════════════════════════════════════════
        bootstrapFinalStandingsTest(club1Id, club2Id, club3Id, club4Id,
                maleAthletes, femaleAthletes, scoringDish, qualSenior,
                dM_1x, dM_2x, gSenior);

        // 6. КОМПЛЕКСНО КЛАСИРАНЕ — Completed competition with pre-computed standings for many disciplines
        bootstrapComplexStandingsTest(club1Id, club2Id, club3Id, club4Id,
                maleAthletes, femaleAthletes, scoringDish, qualSenior,
                dM_1x, dM_2x, dM_4x, dF_1x, dF_2x, dMix_2x, gSenior,
                dM14_1x, dF14_1x, g14,
                dM16_1x, dF16_1x, g16,
                dM18_1x, dF18_1x, g18);

        // 7. ТЕСТ ЗАЯВКИ — Competition for testing entry submission UI
        //    Tests: cox wider age range, MIXED crew 50/50, transfer rules, cox gender flexibility
        bootstrapEntriesTest(club1Id, club2Id, maleAthletes, femaleAthletes, qualSenior, scoringDish);

        log.info("Competition data bootstrapped: {} groups, {} disciplines, {} competitions",
                competitionGroupDefinitionRepository.count(),
                disciplineDefinitionRepository.count(),
                competitionRepository.count());
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  FINAL STANDINGS TEST COMPETITION
    // ═════════════════════════════════════════════════════════════════════════

    private void bootstrapFinalStandingsTest(
            UUID club1Id, UUID club2Id, UUID club3Id, UUID club4Id,
            List<Athlete> males, List<Athlete> females,
            ScoringScheme scoringScheme, QualificationScheme qualScheme,
            DisciplineDefinition dM_1x, DisciplineDefinition dM_2x,
            CompetitionGroupDefinition gSenior) {

        // Create OFFSET_FROM_END scoring scheme with 6 rules for this test competition
        ScoringScheme testScheme = scoringSchemeRepository.save(ScoringScheme.builder()
                .name("ТЕСТ Точкуване от края").scoringType(ScoringType.OFFSET_FROM_END).isActive(true).build());
        int[][] testPoints = {{1, 25}, {2, 21}, {3, 18}, {4, 15}, {5, 13}, {6, 11}};
        for (int[] pp : testPoints) {
            scoringRuleRepository.save(ScoringRule.builder()
                    .scoringSchemeId(testScheme.getId()).placement(pp[0]).basePoints(new BigDecimal(pp[1])).build());
        }
        scoringSchemeBoatCoefficientRepository.save(ScoringSchemeBoatCoefficient.builder()
                .scoringSchemeId(testScheme.getId()).boatClass(BoatClass.SINGLE_SCULL).coefficient(new BigDecimal("1.5")).build());
        scoringSchemeBoatCoefficientRepository.save(ScoringSchemeBoatCoefficient.builder()
                .scoringSchemeId(testScheme.getId()).boatClass(BoatClass.DOUBLE_SCULL).coefficient(new BigDecimal("2.0")).build());

        Competition comp = competitionRepository.save(Competition.builder()
                .shortName("ТЕСТ-КЛАС").name("Тест генериране на класиране")
                .location("Пловдив, Гребна база")
                .startDate(LocalDate.of(2026, 4, 25)).endDate(LocalDate.of(2026, 4, 27))
                .entrySubmissionsOpenAt(Instant.parse("2026-04-15T00:00:00Z"))
                .entrySubmissionsClosedAt(Instant.parse("2026-04-23T00:00:00Z"))
                .lastChangesBeforeTmAt(Instant.parse("2026-04-24T00:00:00Z"))
                .technicalMeetingAt(Instant.parse("2026-04-24T18:00:00Z"))
                .awardingCeremonyAt(Instant.parse("2026-04-27T17:00:00Z"))
                .scoringSchemeId(testScheme.getId())
                .qualificationSchemeId(qualScheme.getId())
                .competitionType(CompetitionType.NATIONAL_WATER).isTemplate(false).build());

        UUID compId = comp.getId();

        // ── Discipline 1: Men 1x (SINGLE_SCULL) — full waterfall with 8 entries ──
        // Progression: 2 Heats → 1 SF → FA + FB
        //
        // Entries (8 athletes from different clubs):
        //   E1: males[0] (club1), E2: males[4] (club1), E3: males[8] (club1)
        //   E4: males[1] (club2), E5: males[5] (club2)
        //   E6: males[2] (club3), E7: males[6] (club3)
        //   E8: males[3] (club4)

        Entry e1 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club1Id)
                .disciplineId(dM_1x.getId()).teamNumber(1).build());
        crewMemberRepository.save(CrewMember.builder().entryId(e1.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(0).getId(), club1Id)).build());

        Entry e2 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club1Id)
                .disciplineId(dM_1x.getId()).teamNumber(2).build());
        crewMemberRepository.save(CrewMember.builder().entryId(e2.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(4).getId(), club1Id)).build());

        Entry e3 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club1Id)
                .disciplineId(dM_1x.getId()).teamNumber(3).build());
        crewMemberRepository.save(CrewMember.builder().entryId(e3.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(8).getId(), club1Id)).build());

        Entry e4 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club2Id)
                .disciplineId(dM_1x.getId()).teamNumber(1).build());
        crewMemberRepository.save(CrewMember.builder().entryId(e4.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(1).getId(), club2Id)).build());

        Entry e5 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club2Id)
                .disciplineId(dM_1x.getId()).teamNumber(2).build());
        crewMemberRepository.save(CrewMember.builder().entryId(e5.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(5).getId(), club2Id)).build());

        Entry e6 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club3Id)
                .disciplineId(dM_1x.getId()).teamNumber(1).build());
        crewMemberRepository.save(CrewMember.builder().entryId(e6.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(2).getId(), club3Id)).build());

        Entry e7 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club3Id)
                .disciplineId(dM_1x.getId()).teamNumber(2).build());
        crewMemberRepository.save(CrewMember.builder().entryId(e7.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(6).getId(), club3Id)).build());

        Entry e8 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club4Id)
                .disciplineId(dM_1x.getId()).teamNumber(1).build());
        crewMemberRepository.save(CrewMember.builder().entryId(e8.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(3).getId(), club4Id)).build());

        // ── Timetable events (ALL OFFICIAL_RESULTS) ──
        // Heat 1: E1, E2, E3, E4 — top 2 advance to SF
        CompetitionTimetableEvent heat1 = saveTtEventOfficial(comp, dM_1x, H, "2026-04-25T08:00:00Z");
        // Heat 2: E5, E6, E7, E8 — top 2 advance to SF
        CompetitionTimetableEvent heat2 = saveTtEventOfficial(comp, dM_1x, H, "2026-04-25T08:10:00Z");
        // SF: E1, E2, E5, E6 — top 3 to FA, rest to FB
        CompetitionTimetableEvent sf = saveTtEventOfficial(comp, dM_1x, SF, "2026-04-26T09:00:00Z");
        // FA: E1, E5, E6 (from SF)
        CompetitionTimetableEvent fa = saveTtEventOfficial(comp, dM_1x, FA, "2026-04-27T10:00:00Z");
        // FB: E2, E3, E4, E7, E8 (from SF loser + heat non-advancers)
        CompetitionTimetableEvent fb = saveTtEventOfficial(comp, dM_1x, FB, "2026-04-27T10:15:00Z");

        // ── Participations — Heats ──
        // Heat 1: E1=420000ms(1st), E2=425000ms(2nd) → advance; E3=430000ms(3rd), E4=435000ms(4th)
        saveParticipation(heat1, e1, 1, ParticipationStatus.FINISHED, 420000, 1);
        saveParticipation(heat1, e2, 2, ParticipationStatus.FINISHED, 425000, 2);
        saveParticipation(heat1, e3, 3, ParticipationStatus.FINISHED, 430000, 3);
        saveParticipation(heat1, e4, 4, ParticipationStatus.FINISHED, 435000, 4);

        // Heat 2: E5=418000ms(1st), E6=422000ms(2nd) → advance; E7=DSQ, E8=428000ms(3rd)
        saveParticipation(heat2, e5, 1, ParticipationStatus.FINISHED, 418000, 1);
        saveParticipation(heat2, e6, 2, ParticipationStatus.FINISHED, 422000, 2);
        saveParticipation(heat2, e7, 3, ParticipationStatus.DSQ, null, null);
        saveParticipation(heat2, e8, 4, ParticipationStatus.FINISHED, 428000, 3);

        // ── Participations — Semi-Final ──
        // SF: E1=415000ms(1st), E5=415000ms(1st TIE!), E6=419000ms(3rd) → all to FA; E2=421000ms(4th) → FB
        saveParticipation(sf, e1, 1, ParticipationStatus.FINISHED, 415000, 1);
        saveParticipation(sf, e5, 2, ParticipationStatus.FINISHED, 415000, 1);  // TIE with E1
        saveParticipation(sf, e6, 3, ParticipationStatus.FINISHED, 419000, 3);
        saveParticipation(sf, e2, 4, ParticipationStatus.FINISHED, 421000, 4);

        // ── Participations — Final A ──
        // FA: E1=410000ms(1st), E5=DNF (use SF time 415000), E6=410000ms(1st TIE with E1!)
        saveParticipation(fa, e1, 1, ParticipationStatus.FINISHED, 410000, 1);
        saveParticipation(fa, e5, 2, ParticipationStatus.DNF, null, null);       // DNF in FA → uses SF time 415000
        saveParticipation(fa, e6, 3, ParticipationStatus.FINISHED, 410000, 1);   // TIE with E1

        // ── Participations — Final B ──
        // FB: E2=423000ms(1st), E3=DNS (has heat time 430000), E4=427000ms(2nd), E8=DNS (has heat time 428000)
        saveParticipation(fb, e2, 1, ParticipationStatus.FINISHED, 423000, 1);
        saveParticipation(fb, e3, 2, ParticipationStatus.DNS, null, null);       // DNS in FB → uses heat time 430000
        saveParticipation(fb, e4, 3, ParticipationStatus.FINISHED, 427000, 2);
        saveParticipation(fb, e8, 4, ParticipationStatus.DNS, null, null);       // DNS in FB → uses heat time 428000

        // E7 is DSQ in Heat 2 — excluded from standings entirely (never advanced)

        // ── Expected final standings for discipline 1x М: ──
        // Rank 1: E1 (FA, 410000ms) — TIE
        // Rank 1: E6 (FA, 410000ms) — TIE
        // Rank 3: E5 (FA/DNF, uses SF time 415000ms)
        // Rank 4: E2 (FB, 423000ms)
        // Rank 5: E4 (FB, 427000ms)
        // Rank 6: E8 (FB/DNS, uses Heat time 428000ms)
        // Rank 7: E3 (FB/DNS, uses Heat time 430000ms)
        // EXCLUDED: E7 (DSQ in Heat)
        //
        // Points (OFFSET_FROM_END): totalRanked=7, coeff=1.5 (SINGLE_SCULL)
        //   Rank 1 (tied): (7-1+1)*1.5 = 10.50
        //   Rank 1 (tied): (7-1+1)*1.5 = 10.50
        //   Rank 3: (7-3+1)*1.5 = 7.50
        //   Rank 4: (7-4+1)*1.5 = 6.00
        //   Rank 5: (7-5+1)*1.5 = 4.50
        //   Rank 6: (7-6+1)*1.5 = 3.00
        //   Rank 7: (7-7+1)*1.5 = 1.50

        // ── Discipline 2: Men 2x (DOUBLE_SCULL) — simpler 2-phase (H → FA) ──
        // 4 entries, just heats + final, to test a second discipline in same competition

        Entry d2e1 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club1Id)
                .disciplineId(dM_2x.getId()).teamNumber(1).build());
        crewMemberRepository.save(CrewMember.builder().entryId(d2e1.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(0).getId(), club1Id)).build());
        crewMemberRepository.save(CrewMember.builder().entryId(d2e1.getId())
                .seatPosition(SeatPosition.BOW).accreditationId(findAccreditationId(males.get(4).getId(), club1Id)).build());

        Entry d2e2 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club2Id)
                .disciplineId(dM_2x.getId()).teamNumber(1).build());
        crewMemberRepository.save(CrewMember.builder().entryId(d2e2.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(1).getId(), club2Id)).build());
        crewMemberRepository.save(CrewMember.builder().entryId(d2e2.getId())
                .seatPosition(SeatPosition.BOW).accreditationId(findAccreditationId(males.get(5).getId(), club2Id)).build());

        Entry d2e3 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club3Id)
                .disciplineId(dM_2x.getId()).teamNumber(1).build());
        crewMemberRepository.save(CrewMember.builder().entryId(d2e3.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(2).getId(), club3Id)).build());
        crewMemberRepository.save(CrewMember.builder().entryId(d2e3.getId())
                .seatPosition(SeatPosition.BOW).accreditationId(findAccreditationId(males.get(6).getId(), club3Id)).build());

        Entry d2e4 = entryRepository.save(Entry.builder().competitionId(compId).clubId(club4Id)
                .disciplineId(dM_2x.getId()).teamNumber(1).build());
        crewMemberRepository.save(CrewMember.builder().entryId(d2e4.getId())
                .seatPosition(SeatPosition.STROKE).accreditationId(findAccreditationId(males.get(3).getId(), club4Id)).build());
        crewMemberRepository.save(CrewMember.builder().entryId(d2e4.getId())
                .seatPosition(SeatPosition.BOW).accreditationId(findAccreditationId(males.get(7).getId(), club4Id)).build());

        // 2x events: 1 Heat → FA (simple)
        CompetitionTimetableEvent d2Heat = saveTtEventOfficial(comp, dM_2x, H, "2026-04-25T08:20:00Z");
        CompetitionTimetableEvent d2Fa = saveTtEventOfficial(comp, dM_2x, FA, "2026-04-27T10:30:00Z");

        // Heat participations
        saveParticipation(d2Heat, d2e1, 1, ParticipationStatus.FINISHED, 380000, 1);
        saveParticipation(d2Heat, d2e2, 2, ParticipationStatus.FINISHED, 385000, 2);
        saveParticipation(d2Heat, d2e3, 3, ParticipationStatus.FINISHED, 390000, 3);
        saveParticipation(d2Heat, d2e4, 4, ParticipationStatus.FINISHED, 395000, 4);

        // FA participations: all advance, normal finishes
        saveParticipation(d2Fa, d2e1, 1, ParticipationStatus.FINISHED, 375000, 1);
        saveParticipation(d2Fa, d2e2, 2, ParticipationStatus.FINISHED, 378000, 2);
        saveParticipation(d2Fa, d2e3, 3, ParticipationStatus.FINISHED, 378000, 2); // TIE with d2e2
        saveParticipation(d2Fa, d2e4, 4, ParticipationStatus.FINISHED, 382000, 4);

        // ── Expected standings for 2x М: ──
        // Rank 1: d2e1 (FA, 375000ms) — coeff 2.0 (DOUBLE_SCULL)
        // Rank 2: d2e2 (FA, 378000ms) — TIE
        // Rank 2: d2e3 (FA, 378000ms) — TIE
        // Rank 4: d2e4 (FA, 382000ms)
        //
        // Points (OFFSET_FROM_END): totalRanked=4, coeff=2.0
        //   Rank 1: (4-1+1)*2.0 = 8.00
        //   Rank 2: (4-2+1)*2.0 = 6.00
        //   Rank 2: (4-2+1)*2.0 = 6.00
        //   Rank 4: (4-4+1)*2.0 = 2.00

        log.info("Final standings test competition '{}' bootstrapped with {} disciplines",
                comp.getShortName(), 2);
    }

    private CompetitionTimetableEvent saveTtEventOfficial(Competition comp, DisciplineDefinition disc,
                                                           QualificationEventType eventType, String scheduledAt) {
        return competitionTimetableEventRepository.save(CompetitionTimetableEvent.builder()
                .competitionId(comp.getId()).disciplineId(disc.getId())
                .qualificationEventType(eventType)
                .scheduledAt(Instant.parse(scheduledAt))
                .eventStatus(CompetitionEventStatus.OFFICIAL_RESULTS)
                .build());
    }

    private void saveParticipation(CompetitionTimetableEvent event, Entry entry,
                                    int lane, ParticipationStatus status, Integer finishTimeMs, Integer place) {
        competitionParticipationRepository.save(CompetitionParticipation.builder()
                .competitionEventId(event.getId())
                .entryId(entry.getId())
                .lane(lane)
                .participationStatus(status)
                .finishTimeMs(finishTimeMs)
                .place(place)
                .build());
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  COMPLEX STANDINGS TEST COMPETITION (pre-computed finals for club rankings)
    // ═════════════════════════════════════════════════════════════════════════

    private void bootstrapComplexStandingsTest(
            UUID club1Id, UUID club2Id, UUID club3Id, UUID club4Id,
            List<Athlete> males, List<Athlete> females,
            ScoringScheme scoringScheme, QualificationScheme qualScheme,
            DisciplineDefinition dM_1x, DisciplineDefinition dM_2x, DisciplineDefinition dM_4x,
            DisciplineDefinition dF_1x, DisciplineDefinition dF_2x, DisciplineDefinition dMix_2x,
            CompetitionGroupDefinition gSenior,
            DisciplineDefinition dM14_1x, DisciplineDefinition dF14_1x, CompetitionGroupDefinition g14,
            DisciplineDefinition dM16_1x, DisciplineDefinition dF16_1x, CompetitionGroupDefinition g16,
            DisciplineDefinition dM18_1x, DisciplineDefinition dF18_1x, CompetitionGroupDefinition g18) {

        Competition comp = competitionRepository.save(Competition.builder()
                .shortName("КОМПЛЕКСНО").name("Тест комплексно класиране")
                .location("София, Панчарево")
                .startDate(LocalDate.of(2026, 5, 10)).endDate(LocalDate.of(2026, 5, 12))
                .entrySubmissionsOpenAt(Instant.parse("2026-05-01T00:00:00Z"))
                .entrySubmissionsClosedAt(Instant.parse("2026-05-08T00:00:00Z"))
                .lastChangesBeforeTmAt(Instant.parse("2026-05-09T00:00:00Z"))
                .technicalMeetingAt(Instant.parse("2026-05-09T18:00:00Z"))
                .awardingCeremonyAt(Instant.parse("2026-05-12T17:00:00Z"))
                .scoringSchemeId(scoringScheme.getId())
                .qualificationSchemeId(qualScheme.getId())
                .competitionType(CompetitionType.NATIONAL_WATER).isTemplate(false).build());

        UUID compId = comp.getId();

        // Create entries for 4 clubs across 5 disciplines
        // Each discipline has 4 entries (one per club) with direct FA
        UUID[][] discEntries = new UUID[5][4]; // [discipline][club0..3]

        DisciplineDefinition[] disciplines = {dM_1x, dM_2x, dM_4x, dF_1x, dF_2x};
        String[] schedTimes = {
            "2026-05-10T09:00:00Z", "2026-05-10T10:00:00Z", "2026-05-10T11:00:00Z",
            "2026-05-11T09:00:00Z", "2026-05-11T10:00:00Z"
        };
        UUID[] clubIds = {club1Id, club2Id, club3Id, club4Id};

        for (int d = 0; d < disciplines.length; d++) {
            DisciplineDefinition disc = disciplines[d];

            // Create FA event with official results
            saveTtEventOfficial(comp, disc, FA, schedTimes[d]);

            // Create entries for each club
            for (int c = 0; c < 4; c++) {
                Entry entry = entryRepository.save(Entry.builder()
                        .competitionId(compId).clubId(clubIds[c])
                        .disciplineId(disc.getId()).teamNumber(1).build());
                discEntries[d][c] = entry.getId();

                // Add crew member
                Athlete athlete = (disc.getGender() == DisciplineGender.FEMALE)
                        ? females.get(d * 4 + c) : males.get(d * 4 + c);
                crewMemberRepository.save(CrewMember.builder().entryId(entry.getId())
                        .seatPosition(SeatPosition.STROKE)
                        .accreditationId(findAccreditationId(athlete.getId(), clubIds[c]))
                        .build());
            }
        }

        // Pre-compute final standings directly
        // Points scheme: FIXED with scoringDish (25,21,18,15,13,11,9,7,5,3,2,1) × boatCoeff
        // Boat coefficients from scoringDish: SINGLE_SCULL=1.5, DOUBLE_SCULL=2.0, QUAD=3.0

        // Discipline 0: 1x M (coeff 1.5) — club1 wins
        saveStanding(compId, disciplines[0].getId(), discEntries[0][0], 1, 410000, "37.50"); // club1: 25×1.5
        saveStanding(compId, disciplines[0].getId(), discEntries[0][1], 2, 415000, "31.50"); // club2: 21×1.5
        saveStanding(compId, disciplines[0].getId(), discEntries[0][2], 3, 420000, "27.00"); // club3: 18×1.5
        saveStanding(compId, disciplines[0].getId(), discEntries[0][3], 4, 425000, "22.50"); // club4: 15×1.5

        // Discipline 1: 2x M (coeff 2.0) — club2 wins
        saveStanding(compId, disciplines[1].getId(), discEntries[1][1], 1, 380000, "50.00"); // club2: 25×2.0
        saveStanding(compId, disciplines[1].getId(), discEntries[1][0], 2, 385000, "42.00"); // club1: 21×2.0
        saveStanding(compId, disciplines[1].getId(), discEntries[1][2], 3, 390000, "36.00"); // club3: 18×2.0
        saveStanding(compId, disciplines[1].getId(), discEntries[1][3], 4, 395000, "30.00"); // club4: 15×2.0

        // Discipline 2: 4x M (coeff 3.0) — club3 wins
        saveStanding(compId, disciplines[2].getId(), discEntries[2][2], 1, 360000, "75.00"); // club3: 25×3.0
        saveStanding(compId, disciplines[2].getId(), discEntries[2][3], 2, 365000, "63.00"); // club4: 21×3.0
        saveStanding(compId, disciplines[2].getId(), discEntries[2][0], 3, 370000, "54.00"); // club1: 18×3.0
        saveStanding(compId, disciplines[2].getId(), discEntries[2][1], 4, 375000, "45.00"); // club2: 15×3.0

        // Discipline 3: 1x F (coeff 1.5) — club4 wins
        saveStanding(compId, disciplines[3].getId(), discEntries[3][3], 1, 440000, "37.50"); // club4: 25×1.5
        saveStanding(compId, disciplines[3].getId(), discEntries[3][2], 2, 445000, "31.50"); // club3: 21×1.5
        saveStanding(compId, disciplines[3].getId(), discEntries[3][1], 3, 450000, "27.00"); // club2: 18×1.5
        saveStanding(compId, disciplines[3].getId(), discEntries[3][0], 4, 455000, "22.50"); // club1: 15×1.5

        // Discipline 4: 2x F (coeff 2.0) — club1 wins (tie with club3 on total, but club1 has more 1st places)
        saveStanding(compId, disciplines[4].getId(), discEntries[4][0], 1, 400000, "50.00"); // club1: 25×2.0
        saveStanding(compId, disciplines[4].getId(), discEntries[4][2], 2, 405000, "42.00"); // club3: 21×2.0
        saveStanding(compId, disciplines[4].getId(), discEntries[4][3], 3, 410000, "36.00"); // club4: 15×2.0... wait
        saveStanding(compId, disciplines[4].getId(), discEntries[4][1], 4, 415000, "30.00"); // club2: 15×2.0

        // Expected gSenior totals:
        // club1: 37.5 + 42.0 + 54.0 + 22.5 + 50.0 = 206.0 (2 first places)
        // club2: 31.5 + 50.0 + 45.0 + 27.0 + 30.0 = 183.5 (1 first place)
        // club3: 27.0 + 36.0 + 75.0 + 31.5 + 42.0 = 211.5 (1 first place)
        // club4: 22.5 + 30.0 + 63.0 + 37.5 + 36.0 = 189.0 (1 first place)
        // Ranking: 1. club3 (211.5), 2. club1 (206.0), 3. club4 (189.0), 4. club2 (183.5)

        // ── Additional age-group disciplines (g14, g16, g18) ──────────────────
        // All are SINGLE_SCULL (coeff 1.5): 1st=37.50, 2nd=31.50, 3rd=27.00, 4th=22.50

        DisciplineDefinition[] extraDiscs = {dM14_1x, dF14_1x, dM16_1x, dF16_1x, dM18_1x, dF18_1x};
        String[] extraSchedTimes = {
            "2026-05-11T11:00:00Z", "2026-05-11T12:00:00Z", "2026-05-11T13:00:00Z",
            "2026-05-12T09:00:00Z", "2026-05-12T10:00:00Z", "2026-05-12T11:00:00Z"
        };

        // Placement order per discipline: [clubIndex for 1st, 2nd, 3rd, 4th]
        // g14 M: club1=1st, club3=2nd, club2=3rd, club4=4th
        // g14 F: club2=1st, club4=2nd, club1=3rd, club3=4th
        // g16 M: club3=1st, club1=2nd, club4=3rd, club2=4th
        // g16 F: club4=1st, club2=2nd, club3=3rd, club1=4th
        // g18 M: club2=1st, club4=2nd, club3=3rd, club1=4th
        // g18 F: club1=1st, club3=2nd, club2=3rd, club4=4th
        int[][] placementOrders = {
            {0, 2, 1, 3}, // g14 M
            {1, 3, 0, 2}, // g14 F
            {2, 0, 3, 1}, // g16 M
            {3, 1, 2, 0}, // g16 F
            {1, 3, 2, 0}, // g18 M
            {0, 2, 1, 3}, // g18 F
        };

        UUID[][] extraEntries = new UUID[6][4]; // [discipline][club0..3]

        for (int d = 0; d < extraDiscs.length; d++) {
            DisciplineDefinition disc = extraDiscs[d];

            // Create FA event with official results
            saveTtEventOfficial(comp, disc, FA, extraSchedTimes[d]);

            // Create entries for each club
            for (int c = 0; c < 4; c++) {
                Entry entry = entryRepository.save(Entry.builder()
                        .competitionId(compId).clubId(clubIds[c])
                        .disciplineId(disc.getId()).teamNumber(1).build());
                extraEntries[d][c] = entry.getId();

                // Use athletes from higher indices to avoid collisions with senior disciplines
                // Males[0..11] and females[12..19] used by senior; use separate offsets here
                Athlete athlete;
                if (disc.getGender() == DisciplineGender.FEMALE) {
                    // Female extra disciplines are at d=1,3,5 → femaleIdx 0,1,2
                    int femaleIdx = d / 2;
                    athlete = females.get(20 + femaleIdx * 4 + c);
                } else {
                    // Male extra disciplines are at d=0,2,4 → maleIdx 0,1,2
                    int maleIdx = d / 2;
                    athlete = males.get(20 + maleIdx * 4 + c);
                }
                crewMemberRepository.save(CrewMember.builder().entryId(entry.getId())
                        .seatPosition(SeatPosition.STROKE)
                        .accreditationId(findAccreditationId(athlete.getId(), clubIds[c]))
                        .build());
            }
        }

        // Pre-compute final standings for extra disciplines
        // All SINGLE_SCULL coeff=1.5: 25×1.5=37.50, 21×1.5=31.50, 18×1.5=27.00, 15×1.5=22.50
        String[] pointsByPlace = {"37.50", "31.50", "27.00", "22.50"};
        int[] timesByPlace = {410000, 415000, 420000, 425000};

        for (int d = 0; d < extraDiscs.length; d++) {
            int[] order = placementOrders[d];
            for (int place = 0; place < 4; place++) {
                int clubIdx = order[place];
                saveStanding(compId, extraDiscs[d].getId(), extraEntries[d][clubIdx],
                        place + 1, timesByPlace[place], pointsByPlace[place]);
            }
        }

        // Expected g14 totals (M + F):
        // club1: 37.50 + 27.00 = 64.50
        // club2: 27.00 + 37.50 = 64.50
        // club3: 31.50 + 22.50 = 54.00
        // club4: 22.50 + 31.50 = 54.00

        // Expected g16 totals (M + F):
        // club1: 31.50 + 22.50 = 54.00
        // club2: 22.50 + 31.50 = 54.00
        // club3: 37.50 + 27.00 = 64.50
        // club4: 27.00 + 37.50 = 64.50

        // Expected g18 totals (M + F):
        // club1: 22.50 + 37.50 = 60.00
        // club2: 37.50 + 27.00 = 64.50
        // club3: 27.00 + 31.50 = 58.50
        // club4: 31.50 + 22.50 = 54.00

        // ── MIXED discipline (gSenior, DOUBLE_SCULL coeff=2.0) ──────────────
        // Points: 1st=50.00, 2nd=42.00, 3rd=36.00, 4th=30.00
        // Placement: club2=1st, club3=2nd, club1=3rd, club4=4th
        saveTtEventOfficial(comp, dMix_2x, FA, "2026-05-12T12:00:00Z");

        UUID[] mixEntryIds = new UUID[4];
        int[] mixOrder = {1, 3, 0, 2}; // club2=1st, club4=2nd... wait: we want club2=1st, club3=2nd, club1=3rd, club4=4th
        int[] mixPlacement = {2, 0, 3, 1}; // index of club that finishes 1st, 2nd, 3rd, 4th → club2, club1, club4, club3
        // Actually: placement[place] = clubIndex: 0=club2(1st), 1=club3(2nd), 2=club1(3rd), 3=club4(4th)
        int[] mixClubOrder = {1, 2, 0, 3}; // clubIdx for place 1,2,3,4

        for (int c = 0; c < 4; c++) {
            Entry entry = entryRepository.save(Entry.builder()
                    .competitionId(compId).clubId(clubIds[c])
                    .disciplineId(dMix_2x.getId()).teamNumber(1).build());
            mixEntryIds[c] = entry.getId();
            // MIXED crew: one male + one female athlete
            crewMemberRepository.save(CrewMember.builder().entryId(entry.getId())
                    .seatPosition(SeatPosition.BOW)
                    .accreditationId(findAccreditationId(males.get(32 + c).getId(), clubIds[c]))
                    .build());
            crewMemberRepository.save(CrewMember.builder().entryId(entry.getId())
                    .seatPosition(SeatPosition.STROKE)
                    .accreditationId(findAccreditationId(females.get(32 + c).getId(), clubIds[c]))
                    .build());
        }

        String[] mixPoints = {"50.00", "42.00", "36.00", "30.00"};
        int[] mixTimes = {380000, 385000, 390000, 395000};
        for (int place = 0; place < 4; place++) {
            int clubIdx = mixClubOrder[place];
            saveStanding(compId, dMix_2x.getId(), mixEntryIds[clubIdx], place + 1, mixTimes[place], mixPoints[place]);
        }

        // MIXED discipline contributes to BOTH male and female team rankings:
        // club1: 36.00 (3rd), club2: 50.00 (1st), club3: 42.00 (2nd), club4: 30.00 (4th)

        log.info("Complex standings test competition bootstrapped: {} with 12 disciplines (5 senior + 1 mixed + 6 age-group), 4 clubs", comp.getShortName());
    }

    private void saveStanding(UUID competitionId, UUID disciplineId, UUID entryId,
                              int rank, int timeMs, String points) {
        competitionFinalStandingRepository.save(CompetitionFinalStanding.builder()
                .competitionId(competitionId)
                .disciplineId(disciplineId)
                .entryId(entryId)
                .overallRank(rank)
                .timeMs(timeMs)
                .points(new BigDecimal(points))
                .build());
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  ENTRIES TEST COMPETITION
    // ═════════════════════════════════════════════════════════════════════════

    private void bootstrapEntriesTest(
            UUID club1Id, UUID club2Id,
            List<Athlete> males, List<Athlete> females,
            QualificationScheme qualScheme, ScoringScheme scoringScheme) {

        // Groups with cox wider age range
        // gTest16: age 15-16, cox age 13-18 (cox can be younger/older than rowers)
        CompetitionGroupDefinition gTest16 = competitionGroupDefinitionRepository.save(
                CompetitionGroupDefinition.builder()
                        .name("Тест Юн. мл.").shortName("Т16")
                        .minAge(15).maxAge(16)
                        .coxMinAge(13).coxMaxAge(18)
                        .maxDisciplinesPerAthlete(3)
                        .isActive(true).build());

        // gTest18: age 17-18, cox age 15-20, with transfer from gTest16 (35%, max 2 transfer/crew)
        CompetitionGroupDefinition gTest18 = competitionGroupDefinitionRepository.save(
                CompetitionGroupDefinition.builder()
                        .name("Тест Юн. ст.").shortName("Т18")
                        .minAge(17).maxAge(18)
                        .coxMinAge(15).coxMaxAge(20)
                        .maxDisciplinesPerAthlete(3)
                        .transferFromGroupId(gTest16.getId())
                        .transferRatio(35)
                        .transferRounding(TransferRounding.FLOOR)
                        .transferredMaxDisciplinesPerAthlete(2)
                        .isActive(true).build());

        // Disciplines for gTest16
        // Male: 1x, 4x+ (coxed quad — tests cox age)
        DisciplineDefinition dTM16_1x = disc("Тест скиф юн.мл.", "1x ТМ16", gTest16,
                BoatClass.SINGLE_SCULL, 1, false, false, 1000, 3, 0, DisciplineGender.MALE);
        DisciplineDefinition dTM16_4xp = disc("Тест 4x+ юн.мл.", "4x+ ТМ16", gTest16,
                BoatClass.COXED_QUAD, 4, true, false, 1000, 2, 0, DisciplineGender.MALE);
        // Female: 1x, 2x
        DisciplineDefinition dTF16_1x = disc("Тест скиф дев.мл.", "1x ТЖ16", gTest16,
                BoatClass.SINGLE_SCULL, 1, false, false, 1000, 3, 0, DisciplineGender.FEMALE);
        DisciplineDefinition dTF16_2x = disc("Тест 2x дев.мл.", "2x ТЖ16", gTest16,
                BoatClass.DOUBLE_SCULL, 2, false, false, 1000, 2, 0, DisciplineGender.FEMALE);
        // MIXED: 2x (no cox), 4x+ (coxed — tests both 50/50 + cox gender)
        DisciplineDefinition dTMix16_2x = disc("Тест 2x смесена юн.мл.", "2x ТMix16", gTest16,
                BoatClass.DOUBLE_SCULL, 2, false, false, 1000, 2, 0, DisciplineGender.MIXED);
        DisciplineDefinition dTMix16_4xp = disc("Тест 4x+ смесена юн.мл.", "4x+ ТMix16", gTest16,
                BoatClass.COXED_QUAD, 4, true, false, 1000, 2, 0, DisciplineGender.MIXED);

        // Disciplines for gTest18 (with transfer)
        DisciplineDefinition dTM18_1x = disc("Тест скиф юн.ст.", "1x ТМ18", gTest18,
                BoatClass.SINGLE_SCULL, 1, false, false, 2000, 3, 0, DisciplineGender.MALE);
        DisciplineDefinition dTM18_4p = disc("Тест 4+ юн.ст.", "4+ ТМ18", gTest18,
                BoatClass.COXED_FOUR, 4, true, false, 2000, 2, 2, DisciplineGender.MALE);
        DisciplineDefinition dTMix18_2x = disc("Тест 2x смесена юн.ст.", "2x ТMix18", gTest18,
                BoatClass.DOUBLE_SCULL, 2, false, false, 2000, 2, 0, DisciplineGender.MIXED);

        // Competition for entries test
        Competition entriesComp = competitionRepository.save(Competition.builder()
                .shortName("ТЕСТ-ЗАЯВКИ").name("Тест подаване на заявки")
                .location("Пловдив, Гребна база")
                .startDate(LocalDate.of(2026, 7, 10)).endDate(LocalDate.of(2026, 7, 12))
                .entrySubmissionsOpenAt(Instant.parse("2026-06-01T00:00:00Z"))
                .entrySubmissionsClosedAt(Instant.parse("2026-07-08T00:00:00Z"))
                .lastChangesBeforeTmAt(Instant.parse("2026-07-09T00:00:00Z"))
                .technicalMeetingAt(Instant.parse("2026-07-09T18:00:00Z"))
                .awardingCeremonyAt(Instant.parse("2026-07-12T17:00:00Z"))
                .scoringSchemeId(scoringScheme.getId())
                .qualificationSchemeId(qualScheme.getId())
                .competitionType(CompetitionType.NATIONAL_WATER)
                .isTemplate(false).build());

        // Timetable events (heats for all disciplines)
        QualificationEventType H = QualificationEventType.H;
        ttEvent(entriesComp, dTM16_1x, H, "2026-07-10T08:00:00Z");
        ttEvent(entriesComp, dTM16_4xp, H, "2026-07-10T08:30:00Z");
        ttEvent(entriesComp, dTF16_1x, H, "2026-07-10T09:00:00Z");
        ttEvent(entriesComp, dTF16_2x, H, "2026-07-10T09:30:00Z");
        ttEvent(entriesComp, dTMix16_2x, H, "2026-07-10T10:00:00Z");
        ttEvent(entriesComp, dTMix16_4xp, H, "2026-07-10T10:30:00Z");
        ttEvent(entriesComp, dTM18_1x, H, "2026-07-10T11:00:00Z");
        ttEvent(entriesComp, dTM18_4p, H, "2026-07-10T11:30:00Z");
        ttEvent(entriesComp, dTMix18_2x, H, "2026-07-10T12:00:00Z");

        // ── Pre-filled entries to test all athlete role combinations ──
        UUID compId = entriesComp.getId();

        // Club1 (ГКС) athletes (index%4=0):
        //   males[0]  = Петър Иванов Петров (2000, 26)
        //   males[4]  = Калин Иванов Русенски (2004, 22)
        //   males[8]  = Пламен Димитров Русенски (2008, 18) ← T18 age
        //   males[12] = Радослав Георгиев Русенски (2010, 16) ← T16 age, cox-eligible for T18
        //   males[16] = Светослав Петров Русенски (2012, 14)
        //   males[28] = Здравко Георгиев Софийски (2005, 21) ← cox-eligible for T18
        //   females[0] = ... at club1, females[4] at club1, females[8] at club1
        //
        // Club2 (ГКВ) athletes (index%4=1):
        //   males[1]  = Димитър Георгиев Василев (2001, 25)
        //   males[5]  = Мартин Стоянов Пловдивски (2005, 21) ← cox-eligible for T18
        //   males[9]  = Васил Стоянов Пловдивски (2008, 18) ← T18 age
        //   males[13] = Даниел Димитров Пловдивски (2010, 16) ← T16 age
        //   females[9] at club2

        // ═══ CLUB1 (ГКС) entries in Т18 ═══

        // Entry: club1, 1x ТМ18, team 1 — Пламен (own rower)
        createEntry(compId, club1Id, dTM18_1x.getId(), 1, males.get(8).getId(), SeatPosition.STROKE);

        // Entry: club1, 1x ТМ18, team 2 — Калин (own rower)
        createEntry(compId, club1Id, dTM18_1x.getId(), 2, males.get(4).getId(), SeatPosition.STROKE);

        // Entry: club1, 4+ ТМ18, team 1 — demonstrates all roles:
        //   STROKE: Пламен (own, also rows in 1x → rower+cox type if we add him as cox elsewhere)
        //   THREE:  Калин (own rower)
        //   TWO:    Васил from club2 (TRANSFER rower) → [Т]
        //   BOW:    Даниел from club2 (TRANSFER rower) → [Т]
        //   COX:    Радослав from club1 (OWN cox-only) → [К]
        createEntry(compId, club1Id, dTM18_4p.getId(), 1, new Object[][]{
                {SeatPosition.STROKE, males.get(8).getId(), club1Id},
                {SeatPosition.THREE, males.get(4).getId(), club1Id},
                {SeatPosition.TWO, males.get(9).getId(), club2Id},
                {SeatPosition.BOW, males.get(13).getId(), club2Id},
                {SeatPosition.COX, males.get(12).getId(), club1Id}
        });

        // Entry: club1, 4+ ТМ18, team 2 — demonstrates cox+rower and transfer rower+cox:
        //   STROKE: Пламен (own, rows here too)
        //   THREE:  Здравко from club1 (own rower)
        //   TWO:    Даниел from club2 (TRANSFER rower) → [Т]
        //   BOW:    Калин (own rower)
        //   COX:    Васил from club2 (TRANSFER, also rows in 4+ t1 → rower+cox transfer) → [Т]
        createEntry(compId, club1Id, dTM18_4p.getId(), 2, new Object[][]{
                {SeatPosition.STROKE, males.get(8).getId(), club1Id},
                {SeatPosition.THREE, males.get(28).getId(), club1Id},
                {SeatPosition.TWO, males.get(13).getId(), club2Id},
                {SeatPosition.BOW, males.get(4).getId(), club1Id},
                {SeatPosition.COX, males.get(9).getId(), club2Id}
        });

        // Entry: club1, 4+ ТМ18, team 3 — demonstrates cox-only transfer:
        //   STROKE: Здравко (own rower)
        //   THREE:  Калин (own rower)
        //   TWO:    Пламен (own rower)
        //   BOW:    Даниел from club2 (TRANSFER rower) → [Т]
        //   COX:    Мартин from club2 (TRANSFER cox-only) → [К] (not [Т], exempt from transfer ratio)
        createEntry(compId, club1Id, dTM18_4p.getId(), 3, new Object[][]{
                {SeatPosition.STROKE, males.get(28).getId(), club1Id},
                {SeatPosition.THREE, males.get(4).getId(), club1Id},
                {SeatPosition.TWO, males.get(8).getId(), club1Id},
                {SeatPosition.BOW, males.get(13).getId(), club2Id},
                {SeatPosition.COX, males.get(5).getId(), club2Id}
        });

        // Entry: club1, 4+ ТМ18, team 4 — demonstrates own rower+cox (non-transfer):
        //   STROKE: Пламен (own rower)
        //   THREE:  Калин (own rower)
        //   TWO:    Даниел from club2 (TRANSFER rower) → [Т]
        //   BOW:    Васил from club2 (TRANSFER rower) → [Т]
        //   COX:    Здравко from club1 (OWN, also rows in 4+ t2/t3 → rower+cox own) → NOT [К], NOT [Т]
        createEntry(compId, club1Id, dTM18_4p.getId(), 4, new Object[][]{
                {SeatPosition.STROKE, males.get(8).getId(), club1Id},
                {SeatPosition.THREE, males.get(4).getId(), club1Id},
                {SeatPosition.TWO, males.get(13).getId(), club2Id},
                {SeatPosition.BOW, males.get(9).getId(), club2Id},
                {SeatPosition.COX, males.get(28).getId(), club1Id}
        });

        // Entry: club1, 2x ТMix18, team 1 — mixed with female transfer
        //   STROKE: Пламен (own male)
        //   BOW:    females[9] from club2 (TRANSFER female) → [Т]
        createEntry(compId, club1Id, dTMix18_2x.getId(), 1, new Object[][]{
                {SeatPosition.STROKE, males.get(8).getId(), club1Id},
                {SeatPosition.BOW, females.get(9).getId(), club2Id}
        });

        // ═══ CLUB2 (ГКВ) entries in Т18 ═══

        // Entry: club2, 1x ТМ18, team 1 — Васил (own rower)
        createEntry(compId, club2Id, dTM18_1x.getId(), 1, males.get(9).getId(), SeatPosition.STROKE);

        // Entry: club2, 4+ ТМ18, team 1 — with transfer from club1
        //   STROKE: Васил (own)
        //   THREE:  Димитър (own)
        //   TWO:    Даниел (own)
        //   BOW:    Пламен from club1 (TRANSFER rower) → [Т]
        //   COX:    Мартин (own cox-only) → [К]
        createEntry(compId, club2Id, dTM18_4p.getId(), 1, new Object[][]{
                {SeatPosition.STROKE, males.get(9).getId(), club2Id},
                {SeatPosition.THREE, males.get(1).getId(), club2Id},
                {SeatPosition.TWO, males.get(13).getId(), club2Id},
                {SeatPosition.BOW, males.get(8).getId(), club1Id},
                {SeatPosition.COX, males.get(5).getId(), club2Id}
        });

        // ═══ Summary of athlete roles for CLUB1 (ГКС) in Т18: ═══
        // Пламен (males[8])   — rower in 1x, 4+ t1, 4+ t2, 4+ t4, 2x mix → 5 дисц. (rower only)
        // Калин (males[4])    — rower in 1x t2, 4+ t1, 4+ t2, 4+ t4 → 4 дисц. (rower only)
        // Здравко (males[28]) — rower in 4+ t2, 4+ t3 + cox in 4+ t4 → 2 дисц. + 1 корм. (OWN ROWER+COX → no marker)
        // Радослав (males[12])— cox in 4+ t1 → 0 дисц. + 1 корм. (OWN COX-ONLY → [К])
        // Васил (males[9])    — transfer rower in 4+ t1, 4+ t4 + cox in 4+ t2 → 2 дисц. + 1 корм. (TRANSFER ROWER+COX → [Т])
        // Даниел (males[13])  — transfer rower in 4+ t1, 4+ t2, 4+ t3, 4+ t4 → [Т]
        // Мартин (males[5])   — transfer cox-only in 4+ t3 → [К] (not [Т], exempt from transfer ratio)
        // females[9]          — transfer rower in 2x mix → [Т]

        log.info("Entries test competition bootstrapped: ТЕСТ-ЗАЯВКИ with groups Т16 (cox 13-18) and Т18 (cox 15-20, transfer 35%)");
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    private CompetitionGroupDefinition saveGroup(
            String name, String shortName,
            Integer minAge, Integer maxAge, int maxDisc,
            UUID transferFromGroupId, Integer transferRatio,
            TransferRounding transferRounding, Integer minCrewForTransfer,
            Integer transferredMaxDisc,
            String maleTeamCoxMinWeight, String maleTeamCoxRequiredWeight, String maleTeamLightMaxWeight,
            String femaleTeamCoxMinWeight, String femaleTeamCoxRequiredWeight, String femaleTeamLightMaxWeight) {
        return competitionGroupDefinitionRepository.save(CompetitionGroupDefinition.builder()
                .name(name).shortName(shortName)
                .minAge(minAge).maxAge(maxAge).maxDisciplinesPerAthlete(maxDisc)
                .transferFromGroupId(transferFromGroupId)
                .transferRatio(transferRatio)
                .transferRounding(transferRounding)
                .minCrewForTransfer(minCrewForTransfer)
                .transferredMaxDisciplinesPerAthlete(transferredMaxDisc)
                .maleTeamCoxMinWeightKg(maleTeamCoxMinWeight != null ? new BigDecimal(maleTeamCoxMinWeight) : null)
                .maleTeamCoxRequiredWeightKg(maleTeamCoxRequiredWeight != null ? new BigDecimal(maleTeamCoxRequiredWeight) : null)
                .maleTeamLightMaxWeightKg(maleTeamLightMaxWeight != null ? new BigDecimal(maleTeamLightMaxWeight) : null)
                .femaleTeamCoxMinWeightKg(femaleTeamCoxMinWeight != null ? new BigDecimal(femaleTeamCoxMinWeight) : null)
                .femaleTeamCoxRequiredWeightKg(femaleTeamCoxRequiredWeight != null ? new BigDecimal(femaleTeamCoxRequiredWeight) : null)
                .femaleTeamLightMaxWeightKg(femaleTeamLightMaxWeight != null ? new BigDecimal(femaleTeamLightMaxWeight) : null)
                .isActive(true).build());
    }

    private DisciplineDefinition disc(
            String name, String shortName, CompetitionGroupDefinition group,
            BoatClass bc, int crewSize, boolean hasCox, boolean lightweight,
            int distance, int maxBoats, int maxTransfer, DisciplineGender gender) {
        return disciplineDefinitionRepository.save(DisciplineDefinition.builder()
                .name(name).shortName(shortName).competitionGroupId(group.getId())
                .gender(gender)
                .boatClass(bc).crewSize(crewSize).hasCoxswain(hasCox)
                .isLightweight(lightweight).distanceMeters(distance)
                .maxBoatsPerClub(maxBoats).maxCrewFromTransfer(maxTransfer)
                .isActive(true).build());
    }

    private void ttEvent(Competition comp, DisciplineDefinition disc, QualificationEventType eventType, String scheduledAt) {
        competitionTimetableEventRepository.save(CompetitionTimetableEvent.builder()
                .competitionId(comp.getId()).disciplineId(disc.getId())
                .qualificationEventType(eventType)
                .scheduledAt(Instant.parse(scheduledAt))
                .build());
    }

    /** Create a single-seat entry (e.g. 1x) */
    private void createEntry(UUID competitionId, UUID clubId, UUID disciplineId, int teamNumber,
                              UUID athleteId, SeatPosition seat) {
        UUID accreditationId = findAccreditationId(athleteId, clubId);
        Entry entry = entryRepository.save(Entry.builder()
                .competitionId(competitionId).clubId(clubId)
                .disciplineId(disciplineId).teamNumber(teamNumber).build());
        crewMemberRepository.save(CrewMember.builder()
                .entryId(entry.getId()).seatPosition(seat).accreditationId(accreditationId).build());
    }

    /** Create a multi-seat entry. Each row: {SeatPosition, athleteId} or {SeatPosition, athleteId, sourceClubId} */
    private void createEntry(UUID competitionId, UUID clubId, UUID disciplineId, int teamNumber,
                              Object[][] seatAthletes) {
        Entry entry = entryRepository.save(Entry.builder()
                .competitionId(competitionId).clubId(clubId)
                .disciplineId(disciplineId).teamNumber(teamNumber).build());
        for (Object[] sa : seatAthletes) {
            UUID sourceClub = sa.length > 2 ? (UUID) sa[2] : clubId;
            UUID accreditationId = findAccreditationId((UUID) sa[1], sourceClub);
            crewMemberRepository.save(CrewMember.builder()
                    .entryId(entry.getId()).seatPosition((SeatPosition) sa[0]).accreditationId(accreditationId).build());
        }
    }

    /** Find the current-year ACTIVE accreditation for an athlete at a club */
    private UUID findAccreditationId(UUID athleteId, UUID clubId) {
        int year = LocalDate.now().getYear();
        return accreditationRepository.findByClubId(clubId).stream()
                .filter(a -> a.getAthleteId().equals(athleteId) && Integer.valueOf(year).equals(a.getYear())
                        && AccreditationStatus.ACTIVE.equals(a.getStatus()))
                .findFirst()
                .map(Accreditation::getId)
                .orElseThrow(() -> new RuntimeException(
                        "No active accreditation found for athlete " + athleteId + " at club " + clubId + " for year " + year));
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
}
