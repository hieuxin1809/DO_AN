package com.web.models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AssignDoctorNurseRequest {
    private Long customerScheduleId;
    private Long doctorId;
    private Long nurseId;
}
