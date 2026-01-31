package com.bfg.platform.user.controller;

import com.bfg.platform.user.service.UserService;
import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.gen.api.UsersApi;
import com.bfg.platform.gen.model.UserDto;
import com.bfg.platform.gen.model.UserCreateRequest;
import com.bfg.platform.gen.model.UserListResponse;
import com.bfg.platform.gen.model.UserUpdateRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@AllArgsConstructor
public class UserController implements UsersApi {

    private final UserService userService;

    // GET methods (Read)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<UserListResponse> getAllUsers(
            String filter,
            String search,
            String orderBy,
            Integer top,
            Integer skip
    ) {
        var result = userService.getAllUsers(filter, search, orderBy, top, skip);
        UserListResponse response = new UserListResponse()
                .count(Math.toIntExact(result.getPage().getTotalElements()))
                .facets(result.getFacets())
                .value(result.getPage().getContent());
        return ResponseEntity.ok(response);
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<UserDto> getUserByUuid(@NotNull(message = "{user.uuid.required}") UUID userUuid) {
        return userService.getUserById(userUuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("User", userUuid));
    }

    // POST methods (Create)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN')")
    public ResponseEntity<UserDto> createUser(@Valid UserCreateRequest userCreateRequest) {
        return userService.createUser(userCreateRequest)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create user"));
    }

    // PATCH methods (Update)
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<UserDto> patchUserByUuid(@NotNull(message = "{user.uuid.required}") UUID userUuid, @Valid UserUpdateRequest userUpdateRequest) {
        return userService.updateUser(userUuid, userUpdateRequest)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("User", userUuid));
    }

    // DELETE methods
    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteUserByUuid(@NotNull(message = "{user.uuid.required}") UUID userUuid) {
        userService.deleteUser(userUuid);
        return ResponseEntity.noContent().build();
    }
}

