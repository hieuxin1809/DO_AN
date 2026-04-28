package com.web.dto;

import lombok.Getter;
import lombok.Setter;

import java.sql.Timestamp;

@Getter
@Setter
public class DoctorDTO {
    private Long id;
    private String specialization;
    private Integer experienceYears;
    private String bio;
    private Timestamp createdDate;
    private String fullName;
    private String avatar;
}
