package com.web.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * Request body cho admin tạo tài khoản Bác sĩ / Y tá.
 * Dùng chung cho cả 2 — field nào không phù hợp thì để trống.
 */
@Getter
@Setter
public class CreateStaffAccountRequest {
    private String email;
    private String password;
    private String fullName;
    private String phone;

    /* ─── Doctor / Nurse ─── */
    private String specialization;   // Doctor only
    private String qualification;    // Nurse only
    private Integer experienceYears;
    private String bio;
    private String avatar;
}
