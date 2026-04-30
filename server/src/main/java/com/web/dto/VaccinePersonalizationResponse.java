package com.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.sql.Date;

/**
 * DTO trả về kết quả kiểm tra cá nhân hóa lịch tiêm vaccine.
 * Được trả về từ endpoint GET /api/vaccine/customer/personalization/{vaccineId}
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VaccinePersonalizationResponse {

    /**
     * Người dùng có thể đặt lịch tiêm không.
     * false nếu đã đủ mũi hoặc chưa đến ngày tiêm tiếp theo.
     */
    private boolean canBook;

    /**
     * Lý do không thể đặt lịch (null nếu canBook = true).
     */
    private String reason;

    /**
     * Số mũi đã tiêm thành công (status = confirmed).
     */
    private int completedDoses;

    /**
     * Số mũi tối đa của vaccine này (null = không giới hạn).
     */
    private Integer maxDose;

    /**
     * Mũi tiếp theo được đề xuất (ví dụ: mũi 2, mũi 3...).
     * null nếu đã đủ mũi.
     */
    private Integer nextDoseNumber;

    /**
     * Ngày sớm nhất có thể tiêm mũi tiếp theo.
     * null nếu không có giới hạn khoảng cách hoặc chưa tiêm mũi nào.
     */
    private Date earliestNextDate;

    /**
     * true nếu ngày có thể tiêm trong vòng 7 ngày tới (sắp đến hạn).
     * Dùng để hiển thị reminder nhắc nhở người dùng.
     */
    private boolean hasReminder;

    /**
     * Nội dung tin nhắn reminder nếu hasReminder = true.
     */
    private String reminderMessage;
}
