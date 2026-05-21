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

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "GMT+7")
    private Timestamp completedDate;

    @ManyToOne
    @JoinColumn(name = "account_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "vaccine_schedule_time_id")
    private VaccineScheduleTime vaccineScheduleTime;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @ManyToOne
    @JoinColumn(name = "nurse_id")
    private Nurse nurse;

    /**
     * true = user (đã login) đặt lịch cho người khác (con/cháu/người thân).
     * Khi true, hệ thống bỏ qua kiểm tra personalization (số mũi, khoảng cách)
     * vì lịch sử tiêm thuộc về user, không phải patient được tiêm.
     * Mặc định false (đặt cho chính mình).
     */
    @Column(name = "booking_for_other")
    private Boolean bookingForOther;
}
