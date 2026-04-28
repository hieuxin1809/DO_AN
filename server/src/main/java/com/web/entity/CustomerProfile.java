package com.web.entity;

import com.web.enums.Gender;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Date;
import java.sql.Timestamp;

@Entity
@Table(name = "customer_profile")
@Getter
@Setter
public class CustomerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profile_id")
    private Long id;

    private String fullName;

    @Enumerated(EnumType.STRING)
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

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private User user;
}
