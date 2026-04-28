package com.web.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.web.enums.CustomerSchedulePay;
import com.web.enums.PayStatus;
import com.web.enums.StatusCustomerSchedule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.mail.MailSessionDefinition;
import javax.persistence.*;
import java.sql.Date;
import java.sql.Timestamp;

@Entity
@Table(name = "customer_schedule")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CustomerSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "GMT+7")
    private Timestamp createdDate;

    private String fullName;

    private Date dob;

    private String phone;

    private String address;
    private String note;

    private String healthStatusBefore;
    private String healthStatusAfter;

    private Integer counterChange;
    @Enumerated(EnumType.STRING)
    @Column(name = "pay_status")
    private PayStatus payStatus;
    @Enumerated(EnumType.STRING)
    private CustomerSchedulePay customerSchedulePay;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private StatusCustomerSchedule statusCustomerSchedule;

    @ManyToOne
    @JoinColumn(name = "account_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "vaccine_schedule_time_id")
    private VaccineScheduleTime vaccineScheduleTime;


}
