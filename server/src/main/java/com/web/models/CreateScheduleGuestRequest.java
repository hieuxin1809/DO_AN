package com.web.models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.sql.Date;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CreateScheduleGuestRequest {
    private Long vaccineScheduleId;
    private Long vaccineScheduleTimeId;
    private String email;
    private String phone;
    private String fullName;
    private String address;
    private Date dob;
    private String idCard;
}
