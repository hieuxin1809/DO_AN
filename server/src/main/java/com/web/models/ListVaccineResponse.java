package com.web.models;

import com.web.entity.AgeGroup;
import com.web.entity.Manufacturer;
import com.web.entity.VaccineType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.sql.Timestamp;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ListVaccineResponse {
    private Long id;

    private String nameVaccine;

    private String description;

    private String image;

    private Integer price;

    private Integer inventory;

    private Timestamp createdDate;

    private Timestamp expirationDate;

    private String status;

    private VaccineType vaccineType;

    private Manufacturer manufacturer;

    private AgeGroup ageGroup;
}
