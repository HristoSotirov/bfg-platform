package com.bfg.platform.user.service;

import com.bfg.platform.common.dto.ListResult;
import com.bfg.platform.gen.model.UserCreateRequest;
import com.bfg.platform.gen.model.UserDto;
import com.bfg.platform.gen.model.UserFacets;
import com.bfg.platform.gen.model.UserUpdateRequest;
import com.bfg.platform.user.entity.User;

import java.util.Optional;
import java.util.UUID;

public interface UserService {
    // GET methods (Read)
    ListResult<UserDto, UserFacets> getAllUsers(String filter, String search, String orderBy, Integer top, Integer skip);
    Optional<UserDto> getUserById(UUID uuid);
    
    // POST methods (Create)
    Optional<UserDto> createUser(UserCreateRequest request);
    
    // PATCH methods (Update)
    Optional<UserDto> updateUser(UUID uuid, UserUpdateRequest request);
    
    // DELETE methods
    void deleteUser(UUID uuid);
}

