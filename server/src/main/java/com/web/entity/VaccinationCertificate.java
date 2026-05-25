package com.web.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.sql.Date;
import java.sql.Timestamp;

/**
 * Giấy xác nhận tiêm chủng.
 *
 * Dùng "snapshot" — chép lại thông tin tại thời điểm cấp giấy thay vì FK động,
 * để giấy cấp ra không bị thay đổi khi nguồn (CustomerProfile, Vaccine, ...) bị sửa.
 */
@Entity
@Table(name = "vaccination_certificate", indexes = {
        @Index(name = "idx_cert_serial", columnList = "serial_no", unique = true)
})
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VaccinationCertificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mã giấy unique — định dạng "IV-YYYY-NNNNNNNN". Hiển thị + dùng cho QR verify. */
    @Column(name = "serial_no", unique = true, nullable = false, length = 40)
    private String serialNo;

    /** Trỏ về lịch tiêm gốc (1 customer_schedule → 1 cert) */
    @Column(name = "customer_schedule_id", unique = true, nullable = false)
    private Long customerScheduleId;

    /* ─── Snapshot người tiêm ─── */
    private String fullNameSnapshot;
    private Date birthdateSnapshot;
    private String phoneSnapshot;
    private String emailSnapshot;
    @Column(length = 500)
    private String addressSnapshot;
    @Column(length = 20)
    private String idCardSnapshot;

    /* ─── Snapshot mũi tiêm ─── */
    private String vaccineName;
    private String vaccineManufacturer;
    private String vaccineType;
    private Integer doseNumber;
    private Integer totalDoses;

    /* ─── Snapshot nơi tiêm ─── */
    private String centerName;
    @Column(length = 500)
    private String centerAddress;
    private String doctorName;
    private String nurseName;

    /* ─── Thời gian ─── */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "GMT+7")
    private Timestamp injectionDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "GMT+7")
    private Timestamp issuedDate;

    /** SHA-256 hash của các field quan trọng + secret, để verify không bị sửa */
    @Column(length = 128)
    private String hash;

    /** Cờ thu hồi — admin có thể đánh dấu giấy không còn hợp lệ */
    @Column(nullable = false)
    private Boolean revoked;

    /** Lý do thu hồi — bắt buộc nhập khi admin thu hồi */
    @Column(name = "revoked_reason", length = 500)
    private String revokedReason;

    /** Email admin đã thu hồi */
    @Column(name = "revoked_by", length = 200)
    private String revokedBy;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "GMT+7")
    @Column(name = "revoked_date")
    private Timestamp revokedDate;

    /**
     * Cờ khóa snapshot. Khi true → cert không còn auto-heal theo profile nữa.
     * Tự động set true khi cert được verify lần đầu qua QR public,
     * hoặc khi user manual đóng giấy.
     */
    @Column(name = "frozen", nullable = false)
    private Boolean frozen;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "GMT+7")
    private Timestamp frozenDate;
}
