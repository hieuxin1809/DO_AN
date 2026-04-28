package com.web.entity;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name = "doctors")
@Getter
@Setter
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "doctor_id")
    private Long id;

    private String specialization;

    private Integer experienceYears;

    private String bio;

    private Timestamp createdDate;

    private String fullName;

    private String avatar;

    @ManyToOne
    @JoinColumn(name = "account_id")
    private User user;
}
