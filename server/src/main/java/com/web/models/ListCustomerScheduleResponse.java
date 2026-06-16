package com.web.models;

import com.web.entity.Doctor;
import com.web.entity.Nurse;
import com.web.entity.Payment;
import com.web.entity.User;
import com.web.entity.VaccineSchedule;
import com.web.entity.VaccineScheduleTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.sql.Timestamp;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ListCustomerScheduleResponse {
    private Long id;
    private String note;
    private VaccineScheduleTime vaccineScheduleTime;
    private User user;
    private Boolean payStatus;
    private String status;
    private Timestamp createdDate;
    private String fullName;
    private String healthStatusBefore;
    private String healthStatusAfter;
    private Timestamp completedDate;
    private Doctor doctor;
    private Nurse nurse;
    private String payStatusName;
    private String bankName;
    private String bankAccount;
    private String bankAccountName;
    private String refundNotes;
    private Double price;
}
