package com.web.service;

import com.web.dto.VaccinePersonalizationResponse;
import com.web.entity.CustomerSchedule;
import com.web.entity.Vaccine;
import com.web.enums.StatusCustomerSchedule;
import com.web.exception.MessageException;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.VaccineRepository;
import com.web.utils.MailService;
import com.web.utils.UserUtils;
import com.web.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Service xử lý nghiệp vụ cá nhân hóa lịch tiêm vaccine.
 *
 * Các chức năng chính:
 * - Kiểm tra user có thể đặt lịch tiêm không (đủ mũi? đúng khoảng cách?)
 * - Đề xuất mũi tiếp theo
 * - Tính ngày sớm nhất có thể tiêm
 * - Cron job gửi email reminder khi sắp đến ngày tiêm
 */
@Service
public class VaccinePersonalizationService {

    @Autowired
    private CustomerScheduleRepository customerScheduleRepository;

    @Autowired
    private VaccineRepository vaccineRepository;

    @Autowired
    private UserUtils userUtils;

    @Autowired
    private MailService mailService;

    /**
     * Kiểm tra điều kiện cá nhân hóa cho user đang đăng nhập và vaccine được chọn.
     *
     * Logic:
     * 1. Lấy thông tin vaccine (maxDose, minIntervalMonths)
     * 2. Đếm số mũi đã tiêm thành công (confirmed) của user
     * 3. Nếu đã đủ mũi → canBook = false
     * 4. Tính ngày sớm nhất tiêm dựa vào mũi cuối + khoảng cách tối thiểu
     * 5. Nếu chưa đến ngày → canBook = false
     * 6. Nếu ngày trong 7 ngày tới → hasReminder = true
     *
     * @param vaccineId ID của vaccine muốn đăng ký
     * @return VaccinePersonalizationResponse chứa kết quả kiểm tra và gợi ý
     */
    public VaccinePersonalizationResponse checkPersonalization(Long vaccineId) {
        // --- 1. Lấy thông tin vaccine ---
        Vaccine vaccine = vaccineRepository.findById(vaccineId)
                .orElseThrow(() -> new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine không tồn tại"));

        // --- 2. Lấy user đang đăng nhập ---
        User user = userUtils.getUserWithAuthority();

        // --- 3. Đếm số mũi đã tiêm thành công ---
        // Truyền enum StatusCustomerSchedule.confirmed qua @Param để tránh InvalidPathException
        Integer completedDoses = customerScheduleRepository.countCompletedDoses(
                user.getId(), vaccineId, StatusCustomerSchedule.injected);
        if (completedDoses == null) {
            completedDoses = 0;
        }

        // --- 4. Khởi tạo builder với giá trị mặc định ---
        VaccinePersonalizationResponse.VaccinePersonalizationResponseBuilder builder =
                VaccinePersonalizationResponse.builder()
                        .completedDoses(completedDoses)
                        .maxDose(vaccine.getMaxDose());

        // --- 5. Kiểm tra số mũi tối đa ---
        if (vaccine.getMaxDose() != null && completedDoses >= vaccine.getMaxDose()) {
            return builder
                    .canBook(false)
                    .reason(String.format(
                            "Bạn đã tiêm đủ %d mũi vaccine '%s'. Không cần tiêm thêm.",
                            vaccine.getMaxDose(), vaccine.getName()))
                    .nextDoseNumber(null)
                    .build();
        }

        // --- 6. Tính mũi tiếp theo ---
        int nextDoseNumber = completedDoses + 1;
        builder.nextDoseNumber(nextDoseNumber);

        // --- 7. Kiểm tra khoảng cách tối thiểu giữa các mũi ---
        if (vaccine.getMinIntervalMonths() != null && completedDoses > 0) {
            // Lấy ngày tiêm mũi cuối cùng đã confirmed, truyền enum qua @Param
            Date lastInjectedDate = customerScheduleRepository.findLastInjectedDate(
                    user.getId(), vaccineId, StatusCustomerSchedule.confirmed);

            if (lastInjectedDate != null) {
                // Tính ngày sớm nhất có thể tiêm = ngày tiêm cuối + khoảng cách tối thiểu
                LocalDate earliestDate = lastInjectedDate.toLocalDate()
                        .plusMonths(vaccine.getMinIntervalMonths());
                LocalDate today = LocalDate.now();

                Date earliestSqlDate = Date.valueOf(earliestDate);
                builder.earliestNextDate(earliestSqlDate);

                if (today.isBefore(earliestDate)) {
                    // Chưa đến ngày tiêm tiếp theo
                    return builder
                            .canBook(false)
                            .reason(String.format(
                                    "Bạn cần chờ ít nhất %d tháng giữa các mũi tiêm. " +
                                    "Ngày sớm nhất có thể tiêm mũi %d là: %s.",
                                    vaccine.getMinIntervalMonths(), nextDoseNumber, earliestDate))
                            .hasReminder(false)
                            .build();
                }

                // --- 8. Kiểm tra reminder: nếu ngày sớm nhất trong vòng 7 ngày tới ---
                long daysUntilEarliest = ChronoUnit.DAYS.between(today, earliestDate);
                if (daysUntilEarliest >= 0 && daysUntilEarliest <= 7) {
                    builder.hasReminder(true)
                           .reminderMessage(String.format(
                                   "Sắp đến ngày tiêm mũi %d của vaccine '%s'! Ngày có thể tiêm: %s.",
                                   nextDoseNumber, vaccine.getName(), earliestDate));
                }
            }
        }

        // --- 9. Có thể đặt lịch ---
        return builder
                .canBook(true)
                .reason(null)
                .build();
    }

    /**
     * Cron job chạy mỗi ngày lúc 8:00 sáng để gửi email nhắc nhở tiêm vaccine.
     *
     * Logic:
     * - Query tất cả lịch đăng ký có ngày tiêm đúng hôm nay
     * - Gửi email reminder cho từng user
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void sendDailyVaccineReminders() {
        LocalDate today = LocalDate.now();

        // Lấy tất cả lịch tiêm có ngày tiêm đúng hôm nay để gửi nhắc
        List<CustomerSchedule> upcomingSchedules = customerScheduleRepository
                .findByInjectDate(today);

        for (CustomerSchedule schedule : upcomingSchedules) {
            try {
                String userEmail = schedule.getUser().getEmail();
                String vaccineName = schedule.getVaccineScheduleTime()
                        .getVaccineSchedule().getVaccine().getName();
                String injectDate = schedule.getVaccineScheduleTime().getInjectDate().toString();

                String subject = "Nhắc nhở: Lịch tiêm vaccine sắp đến!";
                String body = String.format(
                        "Kính chào %s,\n\n" +
                        "Đây là email nhắc nhở lịch tiêm vaccine của bạn:\n" +
                        "- Vaccine: %s\n" +
                        "- Ngày tiêm: %s\n" +
                        "- Thời gian: %s - %s\n\n" +
                        "Vui lòng đến đúng giờ để được phục vụ tốt nhất.\n\n" +
                        "Trân trọng,\nHệ thống Tiêm phòng",
                        schedule.getFullName(),
                        vaccineName,
                        injectDate,
                        schedule.getVaccineScheduleTime().getStart(),
                        schedule.getVaccineScheduleTime().getEnd()
                );

                mailService.sendEmail(userEmail, subject, body, false, false);
            } catch (Exception e) {
                // Silent fail: không để lỗi 1 user làm gián đoạn reminder của user khác
                System.err.println("[Reminder] Lỗi gửi email cho user: "
                        + schedule.getUser().getEmail() + " - " + e.getMessage());
            }
        }
    }
}
