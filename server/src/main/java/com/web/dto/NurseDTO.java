package com.web.dto;

import lombok.Getter;
import lombok.Setter;

import java.sql.Timestamp;

@Getter
@Setter
public class NurseDTO {
    private Long id;
    private String qualification;
    private Integer experienceYears;
    private String bio;
    private Timestamp createdDate;
    private String fullName;
    private String avatar;
}
