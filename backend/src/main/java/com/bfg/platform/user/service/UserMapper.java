package com.bfg.platform.user.service;

import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.user.entity.User;
import com.bfg.platform.gen.model.UserCreateRequest;
import com.bfg.platform.gen.model.UserDto;
import com.bfg.platform.gen.model.UserUpdateRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class UserMapper {

    private UserMapper() {
        throw new IllegalStateException("Utility class");
    }

    public static UserDto toDto(User user) {
        if (user == null) return null;

        UserDto dto = new UserDto();
        dto.setUuid(user.getId());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setDateOfBirth(user.getDateOfBirth());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setIsActive(user.isActive());
        dto.setRole(user.getRole());
        dto.setCreatedAt(user.getCreatedAt() != null
            ? OffsetDateTime.ofInstant(user.getCreatedAt(), ZoneOffset.UTC)
            : null);
        dto.setUpdatedAt(user.getModifiedAt() != null
            ? OffsetDateTime.ofInstant(user.getModifiedAt(), ZoneOffset.UTC)
            : null);
        return dto;
    }

    public static User fromCreateRequest(UserCreateRequest request) {
        User user = new User();
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setEmail(request.getEmail().trim());
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            user.setUsername(request.getUsername().trim());
        } else {
            user.setUsername(request.getEmail().trim());
        }
        user.setRole(request.getRole());
        user.setActive(true);
        return user;
    }

    public static void updateUserFromRequest(User user, UserUpdateRequest request) {
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName().trim());
        }
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getUsername() != null) {
            user.setUsername(request.getUsername().trim());
        }
        if (request.getIsActive() != null) {
            user.setActive(request.getIsActive());
        }
    }
}

