package com.web.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "vaccine_types")
@Getter
@Setter
public class VaccineType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "type_id")
    private Long id;

    private String typeName;

    private Timestamp createdDate;

    private String description;

    @ManyToOne
    @JsonIgnoreProperties(value = {"vaccineTypes"})
    private VaccineType vaccineType;

    private Boolean isPrimary;

    @OneToMany(mappedBy = "vaccineType", cascade = CascadeType.REMOVE)
    @JsonIgnoreProperties(value = {"vaccineType"})
    private List<VaccineType> vaccineTypes = new ArrayList<>();
}
