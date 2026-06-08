package com.web.service;

import com.web.entity.CustomerSchedule;
import com.web.entity.ReminderLog;
import com.web.entity.User;
import com.web.entity.Vaccine;
import com.web.enums.ReminderType;
import com.web.enums.StatusCustomerSchedule;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.ReminderLogRepository;
import com.web.repository.UserRepository;
import com.web.repository.VaccineRepository;
import com.web.utils.EmailTemplateUtils;
import com.web.utils.MailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Hệ thống reminder tự động.
 *
 * Có 2 cron job chạy mỗi sáng:
 *  1. Nhắc lịch tiêm ngày mai — quét customer_schedule có injectDate = today+1
 *  2. Nhắc mũi tiếp theo — quét user đã tiêm mũi N của vaccine nhiều mũi,
 *     đến lúc tiêm mũi N+1 (theo minIntervalMonths của vaccine)
 *
 * Mỗi reminder lưu vào reminder_log để tránh gửi trùng.
 */
@Component
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired private CustomerScheduleRepository customerScheduleRepo;
    @Autowired private VaccineRepository vaccineRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private ReminderLogRepository reminderLogRepo;
    @Autowired private MailService mailService;

    /* ═══════════════════════════════════════════════════════════════
       CRON JOB 1: Nhắc lịch tiêm ngày mai
       Chạy mỗi ngày lúc 8:00 sáng
       Cron format: giây phút giờ ngày tháng thứ
       ═══════════════════════════════════════════════════════════════ */
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void sendUpcomingInjectionReminders() {
        log.info("[Reminder] Bắt đầu cron: nhắc lịch tiêm ngày mai");
        try {
            LocalDate tomorrow = LocalDate.now().plusDays(1);
            int sent = doSendUpcomingReminders(tomorrow);
            log.info("[Reminder] Hoàn thành: gửi {} reminder upcoming injection", sent);
        } catch (Exception e) {
            log.error("[Reminder] Lỗi cron upcoming injection: {}", e.getMessage(), e);
        }
    }

    /** Logic chính — tách ra để gọi cả từ cron và endpoint manual trigger */
    public int doSendUpcomingReminders(LocalDate targetDate) {
        // Entity injectDate là java.sql.Date — convert tránh Hibernate type mismatch
        java.sql.Date sqlDate = java.sql.Date.valueOf(targetDate);
        List<CustomerSchedule> schedules = customerScheduleRepo.findByInjectDate(sqlDate);
        int sent = 0;
        for (CustomerSchedule cs : schedules) {
            // Chỉ nhắc cho lịch đã confirmed (đã thanh toán + duyệt)
            if (cs.getStatusCustomerSchedule() != StatusCustomerSchedule.confirmed) continue;

            // Check đã gửi chưa
            if (reminderLogRepo.existsByCustomerScheduleIdAndTypeAndSuccess(
                    cs.getId(), ReminderType.UPCOMING_INJECTION, true)) continue;

            try {
                sendOneUpcomingReminder(cs);
                sent++;
            } catch (Exception e) {
                log.error("[Reminder] Lỗi gửi cho cs#{}: {}", cs.getId(), e.getMessage());
                saveLog(cs, ReminderType.UPCOMING_INJECTION, null, false, e.getMessage());
            }
        }
        return sent;
    }

    private void sendOneUpcomingReminder(CustomerSchedule cs) {
        User user = cs.getUser();
        if (user == null || user.getEmail() == null || user.getEmail().isEmpty()) {
            throw new IllegalStateException("User hoặc email rỗng");
        }

        String name = cs.getFullName() != null ? cs.getFullName() : user.getEmail();
        String vaccineName = "Vaccine";
        String timeSlot = "—";
        String injectDate = "—";
        String centerName = "—";
        String centerAddress = "—";

        try {
            var vst = cs.getVaccineScheduleTime();
            if (vst != null) {
                if (vst.getInjectDate() != null) {
                    injectDate = DATE_FMT.format(vst.getInjectDate().toLocalDate());
                }
                if (vst.getStart() != null && vst.getEnd() != null) {
                    timeSlot = formatTime(vst.getStart().toString()) + " – " + formatTime(vst.getEnd().toString());
                }
                if (vst.getVaccineSchedule() != null) {
                    if (vst.getVaccineSchedule().getVaccine() != null) {
                        vaccineName = vst.getVaccineSchedule().getVaccine().getName();
                    }
                    if (vst.getVaccineSchedule().getCenter() != null) {
                        var c = vst.getVaccineSchedule().getCenter();
                        centerName = c.getCenterName();
                        centerAddress = joinAddress(c.getStreet(), c.getWard(), c.getDistrict(), c.getCity());
                    }
                }
            }
        } catch (Exception ignore) {}

        String html = EmailTemplateUtils.upcomingInjectionReminder(
                name, vaccineName, injectDate, timeSlot, centerName, centerAddress);

        mailService.sendEmail(user.getEmail(),
                "[iVaccine] Nhắc lịch tiêm ngày mai – " + vaccineName,
                html, false, true);

        ReminderLog logEntry = saveLog(cs, ReminderType.UPCOMING_INJECTION, vaccineName, true, null);
        logEntry.setRecipientName(name);
        logEntry.setSubjectInfo("Lịch tiêm ngày " + injectDate + " (" + timeSlot + ") tại " + centerName);
        reminderLogRepo.save(logEntry);
    }

    /* ═══════════════════════════════════════════════════════════════
       CRON JOB 2: Nhắc mũi tiếp theo
       Chạy mỗi ngày lúc 8:15 sáng (cách 15 phút sau cron 1)
       ═══════════════════════════════════════════════════════════════ */
    @Scheduled(cron = "0 15 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void sendNextDoseReminders() {
        log.info("[Reminder] Bắt đầu cron: nhắc mũi tiếp theo");
        try {
            int sent = doSendNextDoseReminders();
            log.info("[Reminder] Hoàn thành: gửi {} reminder next dose", sent);
        } catch (Exception e) {
            log.error("[Reminder] Lỗi cron next dose: {}", e.getMessage(), e);
        }
    }

    public int doSendNextDoseReminders() {
        // Quét tất cả vaccine có maxDose > 1 và có minIntervalMonths
        List<Vaccine> multiDoseVaccines = vaccineRepo.findAll().stream()
                .filter(v -> v.getMaxDose() != null && v.getMaxDose() > 1)
                .filter(v -> v.getMinIntervalMonths() != null && v.getMinIntervalMonths() > 0)
                .toList();

        int sent = 0;
        LocalDate today = LocalDate.now();

        for (Vaccine vaccine : multiDoseVaccines) {
            // Với mỗi user đã có lịch sử tiêm vaccine này
            // (Đơn giản hóa: query qua customer_schedule)
            List<User> usersInjected = findUsersInjectedVaccine(vaccine.getId());
            for (User user : usersInjected) {
                try {
                    // Đếm mũi đã tiêm thành công
                    Integer completed = customerScheduleRepo.countCompletedDoses(
                            user.getId(), vaccine.getId(), StatusCustomerSchedule.injected);
                    if (completed == null) completed = 0;
                    // Cộng cả "finished"
                    Integer finished = customerScheduleRepo.countCompletedDoses(
                            user.getId(), vaccine.getId(), StatusCustomerSchedule.finished);
                    if (finished != null) completed += finished;

                    // Đã tiêm đủ mũi hoặc chưa tiêm mũi nào → bỏ qua
                    if (completed <= 0 || completed >= vaccine.getMaxDose()) continue;

                    // Lấy ngày tiêm gần nhất
                    Date lastDate = customerScheduleRepo.findLastInjectedDate(
                            user.getId(), vaccine.getId(), StatusCustomerSchedule.injected);
                    if (lastDate == null) {
                        lastDate = customerScheduleRepo.findLastInjectedDate(
                                user.getId(), vaccine.getId(), StatusCustomerSchedule.finished);
                    }
                    if (lastDate == null) continue;

                    LocalDate lastLd = lastDate.toLocalDate();
                    LocalDate expectedNext = lastLd.plusMonths(vaccine.getMinIntervalMonths());

                    // Chỉ nhắc khi: còn 1-14 ngày nữa là tới ngày dự kiến, hoặc đã quá hạn không nhiều
                    long daysUntilNext = today.until(expectedNext, java.time.temporal.ChronoUnit.DAYS);
                    if (daysUntilNext > 14 || daysUntilNext < -30) continue;

                    // Đã gửi reminder NEXT_DOSE cho user+vaccine này rồi → bỏ qua
                    if (reminderLogRepo.existsByUserAndVaccineAndType(
                            user.getId(), vaccine.getName(), ReminderType.NEXT_DOSE)) continue;

                    sendOneNextDoseReminder(user, vaccine, completed, lastLd, expectedNext);
                    sent++;
                } catch (Exception e) {
                    log.error("[Reminder] Lỗi next dose cho user#{}, vaccine#{}: {}",
                            user.getId(), vaccine.getId(), e.getMessage());
                }
            }
        }
        return sent;
    }

    private void sendOneNextDoseReminder(User user, Vaccine vaccine, int currentDose,
                                         LocalDate lastDate, LocalDate expectedDate) {
        if (user.getEmail() == null || user.getEmail().isEmpty()) return;

        String name = user.getEmail();
        // Cố gắng lấy fullName từ profile
        try {
            var profile = customerScheduleRepo.findAllByUserId(user.getId()).stream()
                    .filter(cs -> cs.getFullName() != null && !cs.getFullName().isEmpty())
                    .findFirst();
            if (profile.isPresent()) name = profile.get().getFullName();
        } catch (Exception ignore) {}

        String html = EmailTemplateUtils.nextDoseReminder(
                name, vaccine.getName(),
                currentDose, vaccine.getMaxDose(),
                DATE_FMT.format(lastDate),
                DATE_FMT.format(expectedDate));

        mailService.sendEmail(user.getEmail(),
                "[iVaccine] Đã đến lúc tiêm mũi " + (currentDose + 1) + " – " + vaccine.getName(),
                html, false, true);

        ReminderLog logEntry = ReminderLog.builder()
                .userId(user.getId())
                .recipientEmail(user.getEmail())
                .recipientName(name)
                .type(ReminderType.NEXT_DOSE)
                .vaccineName(vaccine.getName())
                .subjectInfo("Mũi " + (currentDose + 1) + "/" + vaccine.getMaxDose() + " — dự kiến " + DATE_FMT.format(expectedDate))
                .sentAt(new Timestamp(System.currentTimeMillis()))
                .success(true)
                .build();
        reminderLogRepo.save(logEntry);
    }

    /* ─── Helpers ─── */
    private List<User> findUsersInjectedVaccine(Long vaccineId) {
        // Lấy distinct user_id từ customer_schedule có vaccine này và status=injected/finished
        // Đơn giản: query qua repository
        return customerScheduleRepo.findAll().stream()
                .filter(cs -> cs.getStatusCustomerSchedule() == StatusCustomerSchedule.injected
                          || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.finished)
                .filter(cs -> {
                    try {
                        return cs.getVaccineScheduleTime().getVaccineSchedule().getVaccine().getId().equals(vaccineId);
                    } catch (Exception e) { return false; }
                })
                .filter(cs -> cs.getUser() != null)
                .map(CustomerSchedule::getUser)
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u, (a, b) -> a))
                .values().stream().toList();
    }

    private ReminderLog saveLog(CustomerSchedule cs, ReminderType type, String vaccineName, boolean success, String error) {
        ReminderLog entry = ReminderLog.builder()
                .customerScheduleId(cs.getId())
                .userId(cs.getUser() != null ? cs.getUser().getId() : null)
                .recipientEmail(cs.getUser() != null ? cs.getUser().getEmail() : null)
                .type(type)
                .vaccineName(vaccineName)
                .sentAt(new Timestamp(System.currentTimeMillis()))
                .success(success)
                .errorMessage(error)
                .build();
        return reminderLogRepo.save(entry);
    }

    private String formatTime(String s) {
        if (s == null) return "";
        String[] parts = s.split(":");
        if (parts.length >= 2) return parts[0] + ":" + parts[1];
        return s;
    }

    private String joinAddress(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p == null || p.isEmpty()) continue;
            if (sb.length() > 0) sb.append(", ");
            sb.append(p);
        }
        return sb.toString();
    }
}
