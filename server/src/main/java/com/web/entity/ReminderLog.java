package com.web.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.web.enums.ReminderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Timestamp;

/**
 * Log mỗi lần gửi reminder email cho user.
 * Dùng để:
 *  - Tránh gửi trùng (mỗi customer_schedule + type chỉ gửi 1 lần)
 *  - Audit: admin xem được hệ thống đã nhắc ai, lúc nào, kết quả ra sao
 */
@Entity
@Table(name = "reminder_log", indexes = {
        @Index(name = "idx_reminder_schedule_type", columnList = "customer_schedule_id,type"),
        @Index(name = "idx_reminder_user", columnList = "user_id")
})
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_schedule_id")
    private Long customerScheduleId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "recipient_email", length = 200)
    private String recipientEmail;

    @Column(name = "recipient_name", length = 200)
    private String recipientName;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 40)
    private ReminderType type;

    @Column(name = "vaccine_name", length = 200)
    private String vaccineName;

    @Column(name = "subject_info", length = 500)
    private String subjectInfo;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "GMT+7")
    @Column(name = "sent_at", nullable = false)
    private Timestamp sentAt;

    @Column(name = "success", nullable = false)
    private Boolean success;

    @Column(name = "error_message", length = 500)
    private String errorMessage;
}
