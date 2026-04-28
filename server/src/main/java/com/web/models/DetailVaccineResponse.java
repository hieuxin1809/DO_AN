package com.web.models;

import com.web.entity.AgeGroup;
import com.web.entity.Manufacturer;
import com.web.entity.VaccineType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import java.sql.Timestamp;
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class DetailVaccineResponse {
    private Long id;

    private String name;

    private String description;

    private String image;

    private Integer price;

    private Integer inventory;

    private Timestamp createdDate;

    private String status;

    private VaccineType vaccineType;

    private Manufacturer manufacturer;

    private AgeGroup ageGroup;
}
