package com.bfg.platform.user.controller;

import com.bfg.platform.user.service.UserService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.api.UsersApi;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.gen.model.GetAllUsers200Response;
import com.bfg.platform.gen.model.UserDto;
import com.bfg.platform.gen.model.UserCreateRequest;
import com.bfg.platform.gen.model.UserUpdateRequest;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class UserController implements UsersApi {

    private final UserService userService;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllUsers200Response> getAllUsers(
            String filter,
            String search,
            List<String> orderBy,
            Integer top,
            Integer skip,
            List<String> expand
    ) {
        var page = userService.getAllUsers(filter, search, orderBy, top, skip, expand);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllUsers200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<UserDto> getUserByUuid(
            UUID userUuid,
            List<String> expand
    ) {
        return userService.getUserById(userUuid, expand)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("User", userUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN')")
    public ResponseEntity<UserDto> createUser(@Valid UserCreateRequest userCreateRequest) {
        return userService.createUser(userCreateRequest)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create user"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<UserDto> patchUserByUuid(UUID userUuid, @Valid UserUpdateRequest userUpdateRequest) {
        return userService.updateUser(userUuid, userUpdateRequest)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("User", userUuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteUserByUuid(UUID userUuid) {
        userService.deleteUser(userUuid);
        return ResponseEntity.noContent().build();
    }
}

