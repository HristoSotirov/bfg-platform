package com.bfg.platform.user.service;

import com.bfg.platform.user.entity.User;
import com.bfg.platform.gen.model.SystemRole;
import com.bfg.platform.gen.model.UserCreateRequest;
import com.bfg.platform.gen.model.UserDto;
import com.bfg.platform.gen.model.UserUpdateRequest;

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
        dto.setIsActive(user.isActive());
        dto.setRole(user.getRole());
        dto.setCreatedAt(user.getCreatedAt() != null 
                ? user.getCreatedAt().atOffset(ZoneOffset.UTC) 
                : null);
        dto.setUpdatedAt(user.getModifiedAt() != null 
                ? user.getModifiedAt().atOffset(ZoneOffset.UTC) 
                : null);
        return dto;
    }

    public static User fromCreateRequest(UserCreateRequest request) {
        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setUsername(request.getUsername());
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
        if (request.getIsActive() != null) {
            user.setActive(request.getIsActive());
        }
    }
}

