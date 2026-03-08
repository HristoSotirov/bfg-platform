package com.bfg.platform.user.service;

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
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setEmail(request.getEmail());
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            user.setUsername(request.getUsername());
        } else {
            user.setUsername(request.getEmail());
        }
        user.setRole(request.getRole());
        return user;
    }

    public static void updateUserFromRequest(User user, UserUpdateRequest request) {
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getUsername() != null) {
            user.setUsername(request.getUsername());
        }
        if (request.getIsActive() != null) {
            user.setActive(request.getIsActive());
        }
    }
}

