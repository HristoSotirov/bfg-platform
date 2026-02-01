package com.bfg.platform.user.service;

import org.springframework.data.domain.Page;
import com.bfg.platform.common.exception.ConflictException;
import com.bfg.platform.common.exception.ForbiddenException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.query.OffsetBasedPageRequest;
import com.bfg.platform.common.security.SecurityContextHelper;
import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.gen.model.UserCreateRequest;
import com.bfg.platform.gen.model.UserDto;
import com.bfg.platform.gen.model.UserUpdateRequest;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.user.query.UserQueryAdapter;
import com.bfg.platform.user.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityContextHelper securityContextHelper;

    @Override
    public Page<UserDto> getAllUsers(String filter, String search, List<String> orderBy, Integer top, Integer skip, List<String> expand) {
        Specification<User> filterSpec = UserQueryAdapter.parseFilter(filter);
        Specification<User> searchSpec = UserQueryAdapter.parseSearch(search);
        Specification<User> spec = Specification.where(filterSpec).and(searchSpec);
        Pageable pageable = OffsetBasedPageRequest.of(skip, top, UserQueryAdapter.parseSort(orderBy));
        return userRepository.findAll(spec, pageable).map(UserMapper::toDto);
    }

    @Override
    public Optional<UserDto> getUserById(UUID uuid, List<String> expand) {
        return userRepository.findById(uuid)                .map(UserMapper::toDto);
    }

    @Override
    @Transactional
    public Optional<UserDto> createUser(UserCreateRequest request) {
        validateCreatePermissions(request);

        try {
            User user = UserMapper.fromCreateRequest(request);
            user.setPassword(passwordEncoder.encode(request.getPassword()));

            User savedUser = userRepository.save(user);
            return Optional.of(UserMapper.toDto(savedUser));
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(extractUserConflictReason(e));
        }
    }

    @Override
    @Transactional
    public Optional<UserDto> updateUser(UUID uuid, UserUpdateRequest request) {
        return userRepository.findById(uuid)
                .map(user -> {
                    validateUpdatePermissions(user);

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
            throw new ConflictException(extractUserDeleteConflictReason(e));
        }
    }

    private void validateCreatePermissions(UserCreateRequest request) {
        SystemRole currentRole = securityContextHelper.getUserRole();
        SystemRole targetRole = request.getRole();
        if (currentRole == null) {
            throw new ForbiddenException("Current user role is not available");
        }
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

    private void validateUpdatePermissions(User user) {
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

    private String extractUserConflictReason(DataIntegrityViolationException e) {
        String message = e.getMessage();
        if (message == null) return "User with these details already exists";
        
        String lowerMessage = message.toLowerCase();
        
        if (lowerMessage.contains("users_username_key") || 
            (lowerMessage.contains("username") && lowerMessage.contains("unique"))) {
            return "Username already exists";
        }
        
        return "User with these details already exists";
    }

    private String extractUserDeleteConflictReason(DataIntegrityViolationException e) {
        String message = e.getMessage();
        if (message == null) return "Cannot delete user: user is referenced by other records";
        
        String lowerMessage = message.toLowerCase();
        
        if (lowerMessage.contains("fk_clubs_club_admin")) {
            return "User is assigned as a club administrator";
        }
        if (lowerMessage.contains("fk_club_coaches_coach_id")) {
            return "User is assigned as a club coach";
        }
        
        return "Cannot delete user: user is referenced by other records";
    }

}

