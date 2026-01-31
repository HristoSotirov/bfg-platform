package com.bfg.platform.athlete.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "athletes")
@Data
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Athlete {

    @Id
    @Column(name = "id", updatable = false, insertable = false)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "middle_name")
    private String middleName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "gender")
    private String gender;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "medical_examination_due")
    private LocalDate medicalExaminationDue;

    @Column(name = "insurance_from")
    private LocalDate insuranceFrom;

    @Column(name = "insurance_to")
    private LocalDate insuranceTo;

    @Column(name = "registered_on", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant registeredOn;

    @Column(name = "modified_at", insertable = false, nullable = false)
    @Setter(AccessLevel.NONE)
    private Instant modifiedAt;

}

