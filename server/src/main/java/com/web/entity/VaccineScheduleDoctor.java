package com.web.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Date;

@Entity
@Table(name = "vaccine_schedule_doctor")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class VaccineScheduleDoctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    private Date injectDate;

    @ManyToOne
    private Doctor doctor;

    @ManyToOne
    private VaccineSchedule vaccineSchedule;
}
