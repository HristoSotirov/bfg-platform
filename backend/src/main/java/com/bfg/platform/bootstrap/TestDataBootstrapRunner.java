package com.bfg.platform.bootstrap;

import com.bfg.platform.athlete.entity.Accreditation;
import com.bfg.platform.athlete.repository.AccreditationRepository;
import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.athlete.repository.AthleteRepository;
import com.bfg.platform.club.entity.Club;
import com.bfg.platform.club.repository.ClubRepository;
import com.bfg.platform.gen.model.AccreditationStatus;
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

/**
 * Bootstrap test data for development and testing.
 * Only runs when enabled via profile or property.
 * 
 * Enable with: --spring.profiles.active=local
 * Or set: bfg.test-data.enabled=true
 */
@Component
@AllArgsConstructor
@Slf4j
public class TestDataBootstrapRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final AthleteRepository athleteRepository;
    private final AccreditationRepository accreditationRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Override
    public void run(String... args) {
        // Check if test data is enabled
        List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());
        boolean enabled = activeProfiles.contains("local") || activeProfiles.contains("test") ||
                Boolean.parseBoolean(environment.getProperty("bfg.test-data.enabled", "false"));
        
        if (!enabled) {
            log.debug("Test data bootstrap is disabled");
            return;
        }

        // Check if data already exists
        if (!userRepository.findAll().isEmpty() && 
            !clubRepository.findAll().isEmpty() && 
            !athleteRepository.findAll().isEmpty()) {
            log.info("Test data already exists, skipping bootstrap");
            return;
        }

        log.info("Starting test data bootstrap...");

        // Create test users
        createUser("admin@example.com", "admin123", "App", "Admin", SystemRole.APP_ADMIN, LocalDate.of(1985, 1, 10));
        createUser("fedadmin@example.com", "fed123", "Federation", "Admin", SystemRole.FEDERATION_ADMIN, LocalDate.of(1987, 6, 5));
        User clubAdmin1 = createUser("clubadmin1@example.com", "club123", "Club", "Admin One", SystemRole.CLUB_ADMIN, LocalDate.of(1990, 3, 12));
        User clubAdmin2 = createUser("clubadmin2@example.com", "club123", "Club", "Admin Two", SystemRole.CLUB_ADMIN, LocalDate.of(1991, 9, 20));
        createUser("coach1@example.com", "coach123", "John", "Coach", SystemRole.COACH, LocalDate.of(1994, 2, 8));
        createUser("coach2@example.com", "coach123", "Jane", "Coach", SystemRole.COACH, LocalDate.of(1996, 11, 4));

        // Create clubs
        Club club1 = createClub("Rowing Club Sofia", "RCS", clubAdmin1.getId());
        Club club2 = createClub("Varna Rowing Club", "VRC", clubAdmin2.getId());
        createClub("Plovdiv Rowing Club", "PRC", null);

        // Create athletes
        List<Athlete> athletes = Arrays.asList(
            createAthlete("Ivan", "Petrov", "Ivanov", "male", LocalDate.of(1995, 5, 15)),
            createAthlete("Maria", null, "Georgieva", "female", LocalDate.of(1998, 8, 20)),
            createAthlete("Petar", "Ivanov", "Petrov", "male", LocalDate.of(1992, 3, 10)),
            createAthlete("Anna", "Georgieva", "Ivanova", "female", LocalDate.of(1996, 11, 5)),
            createAthlete("Dimitar", null, "Dimitrov", "male", LocalDate.of(1994, 7, 25)),
            createAthlete("Elena", "Petrova", "Georgieva", "female", LocalDate.of(1999, 2, 14)),
            createAthlete("Nikolay", "Ivanov", "Nikolov", "male", LocalDate.of(1991, 9, 30)),
            createAthlete("Svetlana", null, "Svetlova", "female", LocalDate.of(1997, 4, 18)),
            createAthlete("Georgi", "Petrov", "Georgiev", "male", LocalDate.of(1993, 12, 8)),
            createAthlete("Tsvetana", "Ivanova", "Tsvetanova", "female", LocalDate.of(2000, 6, 22))
        );

        // Create accreditations for 2024 and 2025
        int accreditationNumber = 1000;
        
        for (Athlete athlete : athletes) {
            // 2024 accreditation
            createAccreditation(
                UUID.randomUUID(),
                athlete.getId(),
                club1.getId(),
                String.valueOf(accreditationNumber++),
                2024,
                AccreditationStatus.ACTIVE
            );
            
            // 2025 accreditation (only for some athletes)
            if (athletes.indexOf(athlete) % 2 == 0) {
                createAccreditation(
                    UUID.randomUUID(),
                    athlete.getId(),
                    club1.getId(),
                    String.valueOf(accreditationNumber++),
                    2025,
                    AccreditationStatus.ACTIVE
                );
            }
        }

        // Create some accreditations for club2
        createAccreditation(
            UUID.randomUUID(),
            athletes.get(5).getId(),
            club2.getId(),
            String.valueOf(accreditationNumber++),
            2025,
            AccreditationStatus.ACTIVE
        );

        log.info("Test data bootstrap completed successfully!");
        log.info("Test users created:");
        log.info("  - admin/admin123 (APP_ADMIN)");
        log.info("  - fedadmin/fed123 (FEDERATION_ADMIN)");
        log.info("  - clubadmin1/club123 (CLUB_ADMIN)");
        log.info("  - clubadmin2/club123 (CLUB_ADMIN)");
        log.info("  - coach1/coach123 (COACH)");
        log.info("  - coach2/coach123 (COACH)");
        log.info("Created {} clubs, {} athletes, and multiple accreditations", 
            clubRepository.count(), athleteRepository.count());
    }

    private User createUser(String username, String password, String firstName, String lastName, SystemRole role, LocalDate dateOfBirth) {
        if (userRepository.existsByUsername(username)) {
            return userRepository.findByUsername(username).orElseThrow();
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .firstName(firstName)
                .lastName(lastName)
                .dateOfBirth(dateOfBirth)
                .role(role)
                .isActive(true)
                .build();

        return userRepository.save(user);
    }

    private Club createClub(String name, String shortName, UUID clubAdmin) {
        Club club = Club.builder()
                .name(name)
                .shortName(shortName)
                .isActive(true)
                .clubAdmin(clubAdmin)
                .build();

        return clubRepository.save(club);
    }

    private Athlete createAthlete(String firstName, String middleName, String lastName, 
                                   String gender, LocalDate dateOfBirth) {
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

    private void createAccreditation(UUID id, UUID athleteId, UUID clubId, String accreditationNumber,
                                     Integer year, AccreditationStatus status) {
        Accreditation accreditation = Accreditation.builder()
                .id(id)
                .athleteId(athleteId)
                .clubId(clubId)
                .accreditationNumber(accreditationNumber)
                .year(year)
                .status(status)
                .build();

        accreditationRepository.save(accreditation);
    }
}

