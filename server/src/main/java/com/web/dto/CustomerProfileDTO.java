package com.web.dto;

import com.web.enums.Gender;
import lombok.Getter;
import lombok.Setter;

import java.sql.Timestamp;
import java.util.Date;

@Getter
@Setter
public class CustomerProfileDTO {
    private Long id;
    private String fullName;
    private Gender gender;
    private Date birthdate;
    private String phone;
    private String avatar;
    private String city;
    private String district;
    private String ward;
    private String street;
    private Boolean insuranceStatus;
    private String contactName;
    private String contactRelationship;
    private String contactPhone;
    private Timestamp createdDate;
}
