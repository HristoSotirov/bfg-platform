package com.bfg.platform.user.service;

import com.bfg.platform.club.entity.ClubCoach;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ConstraintViolationMessageExtractor;
import com.bfg.platform.common.exception.ForbiddenException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.query.ExpandQueryParser;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.security.SecurityContextHelper;
import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.gen.model.UserBatchMigrationRequest;
import com.bfg.platform.gen.model.UserBatchMigrationRequestItem;
import com.bfg.platform.gen.model.UserBatchMigrationResponse;
import com.bfg.platform.gen.model.UserBatchMigrationSkippedItem;
import com.bfg.platform.gen.model.UserCreateRequest;
import com.bfg.platform.gen.model.UserDto;
import com.bfg.platform.gen.model.UserUpdateRequest;
import com.bfg.platform.common.security.ScopeAccessValidator;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.query.UserQueryAdapter;
import com.bfg.platform.user.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final com.bfg.platform.club.repository.ClubRepository clubRepository;
    private final com.bfg.platform.club.repository.ClubCoachRepository clubCoachRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityContextHelper securityContextHelper;
    private final ScopeAccessValidator scopeAccessValidator;

    @Override
    public Page<UserDto> getAllUsers(String filter, String search, List<String> orderBy, Integer top, Integer skip, List<String> expand) {
        // Validate scope filter - throws 403 if invalid
        scopeAccessValidator.validateFilterScope(filter);
        ExpandQueryParser.parse(expand, User.class);

        // No implicit filter override - use only user-provided filter
        Specification<User> filterSpec = UserQueryAdapter.parseFilter(filter);
        Specification<User> searchSpec = UserQueryAdapter.parseSearch(search);
        Specification<User> spec = Specification.where(filterSpec).and(searchSpec);
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, UserQueryAdapter.parseSort(orderBy));
        Page<UserDto> page = userRepository.findAll(spec, pageable).map(UserMapper::toDto);

        Set<UUID> assignedCoachIds = new java.util.HashSet<>(clubCoachRepository.findAllAssignedCoachIds());
        Set<UUID> assignedAdminIds = new java.util.HashSet<>(clubRepository.findAllAssignedClubAdminIds());

        page.forEach(dto -> {
            if (dto.getRole() == SystemRole.COACH) {
                dto.setAssignedToClub(assignedCoachIds.contains(dto.getUuid()));
            } else if (dto.getRole() == SystemRole.CLUB_ADMIN) {
                dto.setAssignedToClub(assignedAdminIds.contains(dto.getUuid()));
            } else {
                dto.setAssignedToClub(false);
            }
        });

        return page;
    }

    @Override
    public Optional<UserDto> getUserById(UUID uuid, List<String> expand) {
        ExpandQueryParser.parse(expand, User.class);
        Optional<User> opt = userRepository.findById(uuid);
        if (opt.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(UserMapper.toDto(opt.get()));
    }

    @Override
    @Transactional
    public Optional<UserDto> createUser(UserCreateRequest request) {
        validateCreatePermissions(request);

        User user = UserMapper.fromCreateRequest(request);

        SystemRole currentRole = securityContextHelper.getUserRole();
        if (currentRole == SystemRole.CLUB_ADMIN && request.getRole() == SystemRole.COACH) {
            user.setUsername(request.getEmail());
        }

        String randomPassword = generateRandomPassword();
        user.setPassword(passwordEncoder.encode(randomPassword));

        User savedUser = userRepository.save(user);

        if (currentRole == SystemRole.CLUB_ADMIN && request.getRole() == SystemRole.COACH) {
            clubRepository.findByClubAdmin(securityContextHelper.getUserId())
                .ifPresent(club -> {
                    ClubCoach clubCoach = new ClubCoach();
                    clubCoach.setClubId(club.getId());
                    clubCoach.setCoachId(savedUser.getId());
                    clubCoachRepository.save(clubCoach);
                });
        }

        return Optional.of(UserMapper.toDto(savedUser));
    }

    @Override
    @Transactional
    public Optional<UserDto> updateUser(UUID uuid, UserUpdateRequest request) {
        return userRepository.findById(uuid)
                .map(user -> {
                    validateUpdatePermissions(user, request);

                    UserMapper.updateUserFromRequest(user, request);

                    User savedUser = userRepository.save(user);
                    return UserMapper.toDto(savedUser);
                });
    }

    @Override
    @Transactional
    public void deleteUser(UUID uuid) {
        User user = userRepository.findById(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User", uuid));
        validateDeletePermissions(user);

        try {
            userRepository.delete(user);
        } catch (DataIntegrityViolationException e) {
            String message = ConstraintViolationMessageExtractor.extractMessage(e);
            String lowerMessage = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (lowerMessage.contains("fk_clubs_club_admin")) {
                message = "User is assigned as a club administrator";
            } else if (lowerMessage.contains("fk_club_coaches_coach_id")) {
                message = "User is assigned as a club coach";
            }
            throw new ConflictException(message);
        }
    }

    @Override
    @Transactional
    public UserBatchMigrationResponse migrateUsers(UserBatchMigrationRequest request) {
        List<UserDto> created = new java.util.ArrayList<>();
        List<UserBatchMigrationSkippedItem> skipped = new java.util.ArrayList<>();

        for (UserBatchMigrationRequestItem item : request.getUsers()) {
            String email = item.getEmail() != null ? item.getEmail().trim() : "";
            String username = (item.getUsername() != null && !item.getUsername().isBlank())
                    ? item.getUsername().trim()
                    : email;

            if (email.isEmpty()) {
                UserBatchMigrationSkippedItem skip = new UserBatchMigrationSkippedItem();
                skip.setUser(item);
                skip.setReason("Email is required");
                skipped.add(skip);
                continue;
            }

            if (item.getRole() == SystemRole.APP_ADMIN) {
                UserBatchMigrationSkippedItem skip = new UserBatchMigrationSkippedItem();
                skip.setUser(item);
                skip.setReason("Cannot migrate users with APP_ADMIN role");
                skipped.add(skip);
                continue;
            }

            if (userRepository.existsByUsername(username)) {
                UserBatchMigrationSkippedItem skip = new UserBatchMigrationSkippedItem();
                skip.setUser(item);
                skip.setReason("Username already exists: " + username);
                skipped.add(skip);
                continue;
            }

            try {
                User user = new User();
                user.setFirstName(item.getFirstName() != null ? item.getFirstName().trim() : "");
                user.setLastName(item.getLastName() != null ? item.getLastName().trim() : "");
                user.setDateOfBirth(item.getDateOfBirth());
                user.setEmail(email);
                user.setUsername(username);
                user.setRole(item.getRole());
                user.setActive(true);
                user.setPassword(passwordEncoder.encode(generateRandomPassword()));

                User savedUser = userRepository.save(user);
                created.add(UserMapper.toDto(savedUser));
            } catch (DataIntegrityViolationException e) {
                UserBatchMigrationSkippedItem skip = new UserBatchMigrationSkippedItem();
                skip.setUser(item);
                skip.setReason("Duplicate entry: " + ConstraintViolationMessageExtractor.extractMessage(e));
                skipped.add(skip);
            }
        }

        UserBatchMigrationResponse response = new UserBatchMigrationResponse();
        response.setCreated(created);
        response.setSkipped(skipped);
        return response;
    }

    private void validateCreatePermissions(UserCreateRequest request) {
        SystemRole currentRole = securityContextHelper.getUserRole();
        SystemRole targetRole = request.getRole();

        if (currentRole == null) {
            throw new ForbiddenException("Current user role is not available");
        }

        // Role hierarchy validation
        switch (currentRole) {
            case CLUB_ADMIN -> {
                if (targetRole != SystemRole.COACH) {
                    throw new ForbiddenException("Club admins can only create coaches");
                }
            }
            case FEDERATION_ADMIN -> {
                if (targetRole != SystemRole.CLUB_ADMIN && targetRole != SystemRole.COACH) {
                    throw new ForbiddenException("Federation admins can only create club admins or coaches");
                }
            }
            case APP_ADMIN -> {
            }
            default -> throw new ForbiddenException("You are not allowed to create users");
        }
    }

    private void validateUpdatePermissions(User user, UserUpdateRequest request) {
        if (user.getId().equals(securityContextHelper.getUserId()) && request.getIsActive() != null) {
            throw new ForbiddenException("You cannot update your own profile");
        }
        SystemRole currentRole = securityContextHelper.getUserRole();
        SystemRole targetRole = user.getRole();
        if (currentRole == null) {
            throw new ForbiddenException("Current user role is not available");
        }
        switch (currentRole) {
            case FEDERATION_ADMIN -> {
                if (targetRole != SystemRole.CLUB_ADMIN && targetRole != SystemRole.COACH) {
                    throw new ForbiddenException("Federation admins can only update club admins or coaches");
                }
            }
            case APP_ADMIN -> {
            }
            default -> throw new ForbiddenException("You are not allowed to update users");
        }
    }

    private void validateDeletePermissions(User user) {
        SystemRole currentRole = securityContextHelper.getUserRole();
        SystemRole targetRole = user.getRole();
        if (currentRole == null) {
            throw new ForbiddenException("Current user role is not available");
        }
        switch (currentRole) {
            case FEDERATION_ADMIN -> {
                if (targetRole != SystemRole.CLUB_ADMIN && targetRole != SystemRole.COACH) {
                    throw new ForbiddenException("Federation admins can only delete club admins or coaches");
                }
            }
            case APP_ADMIN -> {
            }
            default -> throw new ForbiddenException("You are not allowed to delete users");
        }
    }


    private String generateRandomPassword() {
        String upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lowerCase = "abcdefghijklmnopqrstuvwxyz";
        String digits = "0123456789";
        String specialChars = "!@#$%^&*";
        String allChars = upperCase + lowerCase + digits + specialChars;

        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder(16);

        password.append(upperCase.charAt(random.nextInt(upperCase.length())));
        password.append(lowerCase.charAt(random.nextInt(lowerCase.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(specialChars.charAt(random.nextInt(specialChars.length())));

        for (int i = 4; i < 16; i++) {
            password.append(allChars.charAt(random.nextInt(allChars.length())));
        }

        char[] passwordArray = password.toString().toCharArray();
        for (int i = passwordArray.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = passwordArray[i];
            passwordArray[i] = passwordArray[j];
            passwordArray[j] = temp;
        }

        return new String(passwordArray);
    }

}
