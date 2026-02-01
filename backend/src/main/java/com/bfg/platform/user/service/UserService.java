package com.bfg.platform.user.service;

import com.bfg.platform.gen.model.UserCreateRequest;
import com.bfg.platform.gen.model.UserDto;
import com.bfg.platform.gen.model.UserUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserService {
    Page<UserDto> getAllUsers(String filter, String search, List<String> orderBy, Integer top, Integer skip, List<String> expand);
    Optional<UserDto> getUserById(UUID uuid, List<String> expand);
    
    Optional<UserDto> createUser(UserCreateRequest request);
    
    Optional<UserDto> updateUser(UUID uuid, UserUpdateRequest request);
    
    void deleteUser(UUID uuid);
}

