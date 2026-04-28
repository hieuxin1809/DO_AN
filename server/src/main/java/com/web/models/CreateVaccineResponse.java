package com.web.models;

import com.web.entity.AgeGroup;
import com.web.entity.Manufacturer;
import com.web.entity.VaccineType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.sql.Timestamp;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CreateVaccineResponse {
    private Long id;

    private String name;

    private String description;

    private String image;

    private Integer price;

    private Integer inventory;

    private Integer quantity;


    private String status;

    private Timestamp createdDate;

    private VaccineType vaccineType;

    private Manufacturer manufacturer;

    private AgeGroup ageGroup;
}
