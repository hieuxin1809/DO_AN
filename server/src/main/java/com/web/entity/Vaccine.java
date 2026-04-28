package com.web.entity;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name = "vaccine")
@Getter
@Setter
public class Vaccine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    private String name;

    private String description;

    private String image;

    private Integer price;
    private Integer quantity;

    private Timestamp createdDate;

    private Integer inventory;

    private String status;
    private Timestamp expirationDate;

    @ManyToOne
    @JoinColumn(name = "type_id")
    private VaccineType vaccineType;

    @ManyToOne
    @JoinColumn(name = "manufacturer_id")
    private Manufacturer manufacturer;

    @ManyToOne
    @JoinColumn(name = "age_group_id")
    private AgeGroup ageGroup;
}
