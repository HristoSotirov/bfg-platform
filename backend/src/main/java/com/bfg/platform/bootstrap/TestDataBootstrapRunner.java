package com.bfg.platform.bootstrap;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.repository.AccreditationRepository;
import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.club.repository.ClubCoachRepository;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.gen.model.AccreditationStatus;
import com.bfg.platform.gen.model.Gender;
import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Component
@AllArgsConstructor
@Slf4j
public class TestDataBootstrapRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final ClubCoachRepository clubCoachRepository;
    private final AthleteRepository athleteRepository;
    private final AccreditationRepository accreditationRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Override
    public void run(String... args) {
        List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());
        boolean enabled = activeProfiles.contains("local") || activeProfiles.contains("test") ||
                Boolean.parseBoolean(environment.getProperty("bfg.test-data.enabled", "false"));
        
        if (!enabled) {
            return;
        }

        if (!clubRepository.findAll().isEmpty() && 
            !athleteRepository.findAll().isEmpty()) {
            return;
        }

        createUser("admin@example.com", "admin123", "App", "Admin", SystemRole.APP_ADMIN, LocalDate.of(1985, 1, 10));
        createUser("fedadmin@example.com", "fed123", "Federation", "Admin", SystemRole.FEDERATION_ADMIN, LocalDate.of(1987, 6, 5));
        
        User clubAdmin1 = createUser("clubadmin1@example.com", "club123", "Иван", "Петров", SystemRole.CLUB_ADMIN, LocalDate.of(1990, 3, 12));
        User clubAdmin2 = createUser("clubadmin2@example.com", "club123", "Георги", "Иванов", SystemRole.CLUB_ADMIN, LocalDate.of(1991, 9, 20));
        User clubAdmin3 = createUser("clubadmin3@example.com", "club123", "Петър", "Георгиев", SystemRole.CLUB_ADMIN, LocalDate.of(1992, 5, 15));
        createUser("clubadmin4@example.com", "club123", "Иван", "Петрое", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25));
        createUser("clubadmin5@example.com", "club123", "Петър", "Димитров", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25));
        createUser("clubadmin6@example.com", "club123", "Мартин", "Георгиев", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25));
        createUser("clubadmin7@example.com", "club123", "Георги", "Димитров", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25));
        createUser("clubadmin8@example.com", "club123", "Димитър", "Димитров", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25));
        createUser("clubadmin9@example.com", "club123", "Ники", "Димитров", SystemRole.CLUB_ADMIN, LocalDate.of(1988, 7, 25));

        User coach1 = createUser("coach1@example.com", "coach123", "Мария", "Николова", SystemRole.COACH, LocalDate.of(1994, 2, 8));
        User coach2 = createUser("coach2@example.com", "coach123", "Елена", "Стоянова", SystemRole.COACH, LocalDate.of(1996, 11, 4));
        createUser("coach3@example.com", "coach123", "Стоян", "Василев", SystemRole.COACH, LocalDate.of(1993, 4, 18));

        Club club1 = createClub("Гребен клуб София", "ГКС", clubAdmin1.getId(), "01", "gks@example.com");
        Club club2 = createClub("Гребен клуб Варна", "ГКВ", clubAdmin2.getId(), "02", "gkv@example.com");
        Club club3 = createClub("Гребен клуб Пловдив", "ГКП", clubAdmin3.getId(), "03", "gkp@example.com");

        assignCoachToClub(coach1, club1);
        assignCoachToClub(coach2, club2);

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
        
        createAccreditation(athlete1.getId(), club1.getId(), "010001", 2012, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getId(), "010001", 2013, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getId(), "010001", 2014, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getId(), "010001", 2015, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getId(), "010001", 2016, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getId(), "010001", 2017, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club2.getId(), "020010", 2018, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club2.getId(), "020010", 2019, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club2.getId(), "020010", 2020, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club2.getId(), "020010", 2021, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club3.getId(), "030010", 2022, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club3.getId(), "030010", 2023, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club3.getId(), "030010", 2024, AccreditationStatus.EXPIRED);
        createAccreditation(athlete1.getId(), club1.getId(), "010001", 2025, AccreditationStatus.NEW_PHOTO_REQUIRED);
        createAccreditation(athlete1.getId(), club1.getId(), "010001", 2026, AccreditationStatus.ACTIVE);
        
        createAccreditation(athlete2.getId(), club1.getId(), "010002", 2023, AccreditationStatus.EXPIRED);
        createAccreditation(athlete2.getId(), club1.getId(), "010002", 2024, AccreditationStatus.EXPIRED);
        createAccreditation(athlete2.getId(), club1.getId(), "010002", 2025, AccreditationStatus.EXPIRED);
        createAccreditation(athlete2.getId(), club2.getId(), "020011", currentYear, AccreditationStatus.PENDING_VALIDATION);
        
        createAccreditation(athlete3.getId(), club1.getId(), "010003", currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete4.getId(), club1.getId(), "010004", currentYear, AccreditationStatus.NEW_PHOTO_REQUIRED);
        
        createAccreditation(athlete5.getId(), club2.getId(), "020001", previousYear, AccreditationStatus.EXPIRED);
        createAccreditation(athlete5.getId(), club2.getId(), "020001", currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete6.getId(), club2.getId(), "020002", currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete7.getId(), club2.getId(), "020003", previousYear, AccreditationStatus.EXPIRED);
        createAccreditation(athlete7.getId(), club2.getId(), "020003", currentYear, AccreditationStatus.ACTIVE);
        
        createAccreditation(athlete8.getId(), club3.getId(), "030001", currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete9.getId(), club3.getId(), "030002", previousYear, AccreditationStatus.EXPIRED);
        createAccreditation(athlete9.getId(), club3.getId(), "030002", currentYear, AccreditationStatus.ACTIVE);
        createAccreditation(athlete10.getId(), club3.getId(), "030003", currentYear, AccreditationStatus.PENDING_VALIDATION);
    }

    private User createUser(String username, String password, String firstName, String lastName, SystemRole role, LocalDate dateOfBirth) {
        if (userRepository.existsByUsername(username)) {
            return userRepository.findByUsername(username).orElseThrow();
        }

        User user = User.builder()
                .username(username)
                .email(username)
                .password(passwordEncoder.encode(password))
                .firstName(firstName)
                .lastName(lastName)
                .dateOfBirth(dateOfBirth)
                .role(role)
                .isActive(true)
                .build();

        return userRepository.save(user);
    }

    private Club createClub(String name, String shortName, UUID clubAdmin, String cardPrefix, String clubEmail) {
        Club club = Club.builder()
                .name(name)
                .shortName(shortName)
                .isActive(true)
                .clubAdmin(clubAdmin)
                .cardPrefix(cardPrefix)
                .clubEmail(clubEmail)
                .build();

        return clubRepository.save(club);
    }

    private Athlete createAthlete(String firstName, String middleName, String lastName,
                                   Gender gender, LocalDate dateOfBirth) {
        Athlete athlete = Athlete.builder()
                .firstName(firstName)
                .middleName(middleName)
                .lastName(lastName)
                .gender(gender)
                .dateOfBirth(dateOfBirth)
                .medicalExaminationDue(dateOfBirth.plusYears(1))
                .insuranceFrom(LocalDate.now().minusMonths(6))
                .insuranceTo(LocalDate.now().plusMonths(6))
                .build();

        return athleteRepository.save(athlete);
    }

    private void createAccreditation(UUID athleteId, UUID clubId, String accreditationNumber,
                                     Integer year, AccreditationStatus status) {
        Accreditation accreditation = Accreditation.builder()
                .athleteId(athleteId)
                .clubId(clubId)
                .accreditationNumber(accreditationNumber)
                .year(year)
                .status(status)
                .build();

        accreditationRepository.save(accreditation);
    }

    private void assignCoachToClub(User coach, Club club) {
        if (clubCoachRepository.existsByClubIdAndCoachId(club.getId(), coach.getId())) {
            return; // Already assigned
        }

        ClubCoach clubCoach = ClubCoach.builder()
                .coachId(coach.getId())
                .clubId(club.getId())
                .build();

        clubCoachRepository.save(clubCoach);
    }
}

