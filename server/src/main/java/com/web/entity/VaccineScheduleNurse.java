package com.web.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Date;

@Entity
@Table(name = "vaccine_schedule_nurse")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class VaccineScheduleNurse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    private Date injectDate;

    @ManyToOne
    private Nurse nurse;

    @ManyToOne
    private VaccineSchedule vaccineSchedule;
}
