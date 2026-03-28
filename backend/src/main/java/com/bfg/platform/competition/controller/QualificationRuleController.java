package com.bfg.platform.competition.controller;

import com.bfg.platform.common.exception.ResourceCreationException;
import com.bfg.platform.common.exception.ResourceNotFoundException;
import com.bfg.platform.common.util.PageConverter;
import com.bfg.platform.competition.service.QualificationRuleService;
import com.bfg.platform.gen.api.QualificationRulesApi;
import com.bfg.platform.gen.model.GetAllQualificationRules200Response;
import com.bfg.platform.gen.model.QualificationRuleRequest;
import com.bfg.platform.gen.model.QualificationRuleDto;
import com.bfg.platform.gen.model.QualificationRuleRequest;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@AllArgsConstructor
public class QualificationRuleController implements QualificationRulesApi {

    private final QualificationRuleService service;

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<GetAllQualificationRules200Response> getAllQualificationRules(
            String filter, List<String> orderBy,
            Integer top, Integer skip) {
        var page = service.getAll(filter, null, orderBy, top, skip);
        return ResponseEntity.ok(PageConverter.toResponse(page, GetAllQualificationRules200Response.class));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<QualificationRuleDto> createQualificationRule(
            @Valid @RequestBody QualificationRuleRequest request) {
        return service.create(request)
                .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
                .orElseThrow(() -> new ResourceCreationException("Failed to create qualification rule"));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN', 'CLUB_ADMIN', 'COACH')")
    public ResponseEntity<QualificationRuleDto> getQualificationRuleByUuid(UUID uuid) {
        return service.getByUuid(uuid)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification rule", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<QualificationRuleDto> updateQualificationRuleByUuid(
            UUID uuid, @Valid @RequestBody QualificationRuleRequest request) {
        return service.update(uuid, request)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Qualification rule", uuid));
    }

    @Override
    @PreAuthorize("hasAnyAuthority('FEDERATION_ADMIN', 'APP_ADMIN')")
    public ResponseEntity<Void> deleteQualificationRuleByUuid(UUID uuid) {
        service.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
