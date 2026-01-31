package com.bfg.platform.athlete.mapper;

import com.bfg.platform.athlete.entity.Athlete;
import com.bfg.platform.gen.model.*;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Component
public class AthleteMapper {

    public static AthleteDto toDto(Athlete athlete) {
        if (athlete == null) {
            return null;
        }
        AthleteDto dto = new AthleteDto()
                .uuid(athlete.getId())
                .firstName(athlete.getFirstName())
                .middleName(athlete.getMiddleName())
                .lastName(athlete.getLastName())
                .dateOfBirth(athlete.getDateOfBirth())
                .gender(athlete.getGender())
                .medicalExaminationDue(athlete.getMedicalExaminationDue())
                .insuranceFrom(athlete.getInsuranceFrom())
                .insuranceTo(athlete.getInsuranceTo())
                .registeredOn(athlete.getRegisteredOn() != null
                        ? OffsetDateTime.ofInstant(athlete.getRegisteredOn(), ZoneOffset.UTC)
                        : null);

        return dto;
    }

    public static Athlete fromCreateRequest(AthleteCreateRequest request) {
        return Athlete.builder()
                .firstName(request.getFirstName())
                .middleName(request.getMiddleName())
                .lastName(request.getLastName())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .build();
    }

    public static void updateAthleteFromRequest(Athlete athlete, AthleteUpdateRequest request) {
        if (request.getFirstName() != null) {
            athlete.setFirstName(request.getFirstName());
        }
        if (request.getMiddleName() != null) {
            athlete.setMiddleName(request.getMiddleName());
        }
        if (request.getLastName() != null) {
            athlete.setLastName(request.getLastName());
        }
        if (request.getGender() != null) {
            athlete.setGender(request.getGender());
        }
        if (request.getDateOfBirth() != null) {
            athlete.setDateOfBirth(request.getDateOfBirth());
        }
    }

    public static Athlete fromMigrationItem(AthleteBatchMigrationRequestItem item) {
        return Athlete.builder()
                .firstName(item.getFirstName())
                .middleName(item.getMiddleName())
                .lastName(item.getLastName())
                .dateOfBirth(item.getDateOfBirth())
                .gender(item.getGender())
                .build();
    }
}

