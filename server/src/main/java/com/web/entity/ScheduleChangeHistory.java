package com.web.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;

/**
 * Audit log mỗi lần customer đổi lịch tiêm.
 * 1 row = 1 lần đổi, snapshot slot CŨ (from*) và slot MỚI (to*).
 * Không động đến CustomerSchedule entity — chỉ insert.
 */
@Entity
@Table(name = "schedule_change_history", indexes = {
        @Index(name = "idx_sch_change_cs_id", columnList = "customer_schedule_id")
})
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ScheduleChangeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Trỏ về CustomerSchedule. KHÔNG dùng @ManyToOne để query nhẹ + tránh lazy issue. */
    @Column(name = "customer_schedule_id", nullable = false)
    private Long customerScheduleId;

    /* ─── Snapshot slot CŨ ─── */
    @Column(name = "from_time_id")
    private Long fromTimeId;
    @Column(name = "from_inject_date")
    private Date fromInjectDate;
    @Column(name = "from_start")
    private Time fromStart;
    @Column(name = "from_end")
    private Time fromEnd;

    /* ─── Snapshot slot MỚI ─── */
    @Column(name = "to_time_id")
    private Long toTimeId;
    @Column(name = "to_inject_date")
    private Date toInjectDate;
    @Column(name = "to_start")
    private Time toStart;
    @Column(name = "to_end")
    private Time toEnd;

    /* ─── Metadata ─── */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "GMT+7")
    @Column(name = "changed_at", nullable = false)
    private Timestamp changedAt;

    @Column(name = "changed_by_user_id")
    private Long changedByUserId;
}
