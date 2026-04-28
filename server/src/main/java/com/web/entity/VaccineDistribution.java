package com.web.entity;

import com.web.enums.DistributionType;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name = "vaccine_distribution")
@Getter
@Setter
public class VaccineDistribution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "distribution_id")
    private Long id;

    private Integer quantity;

    private Timestamp distributionDate;

    @Column(name = "distribution_type")
    @Enumerated(EnumType.STRING)
    private DistributionType distributionType;

    @ManyToOne
    @JoinColumn(name = "inventory_id")
    private VaccineInventory vaccineInventory;
}
