package com.web.api;

import com.web.entity.ReminderLog;
import com.web.enums.ReminderType;
import com.web.repository.ReminderLogRepository;
import com.web.service.ReminderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reminder")
@CrossOrigin
public class ReminderApi {

    @Autowired private ReminderService reminderService;
    @Autowired private ReminderLogRepository reminderLogRepository;

    /** GET /api/reminder/admin/log — list reminder đã gửi */
    @GetMapping("/admin/log")
    public ResponseEntity<?> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean success,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        ReminderType rt = null;
        if (type != null && !type.isBlank()) {
            try { rt = ReminderType.valueOf(type); } catch (Exception ignore) {}
        }
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        Page<ReminderLog> p = reminderLogRepository.searchAdmin(kw, rt, success, PageRequest.of(page, size));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", p.getContent());
        body.put("totalElements", p.getTotalElements());
        body.put("totalPages", p.getTotalPages());
        body.put("page", p.getNumber());
        body.put("size", p.getSize());

        // Stats nhỏ
        body.put("totalSuccess",  reminderLogRepository.countBySuccess(true));
        body.put("totalFail",     reminderLogRepository.countBySuccess(false));
        body.put("totalUpcoming", reminderLogRepository.countByType(ReminderType.UPCOMING_INJECTION));
        body.put("totalNextDose", reminderLogRepository.countByType(ReminderType.NEXT_DOSE));
        return new ResponseEntity<>(body, HttpStatus.OK);
    }

    /**
     * POST /api/reminder/admin/trigger
     * Chạy ngay cron job mà không cần đợi đến 8h sáng — để test.
     * Body: { "type": "UPCOMING_INJECTION" | "NEXT_DOSE", "date": "yyyy-MM-dd" (chỉ cho UPCOMING) }
     */
    @PostMapping("/admin/trigger")
    public ResponseEntity<?> trigger(@RequestBody Map<String, String> body) {
        String type = body.get("type");
        Map<String, Object> result = new LinkedHashMap<>();

        if ("UPCOMING_INJECTION".equalsIgnoreCase(type)) {
            String dateStr = body.get("date");
            LocalDate target = (dateStr != null && !dateStr.isBlank())
                    ? LocalDate.parse(dateStr)
                    : LocalDate.now().plusDays(1);
            int sent = reminderService.doSendUpcomingReminders(target);
            result.put("type", "UPCOMING_INJECTION");
            result.put("targetDate", target.toString());
            result.put("sent", sent);
        } else if ("NEXT_DOSE".equalsIgnoreCase(type)) {
            int sent = reminderService.doSendNextDoseReminders();
            result.put("type", "NEXT_DOSE");
            result.put("sent", sent);
        } else {
            result.put("error", "type phải là UPCOMING_INJECTION hoặc NEXT_DOSE");
            return new ResponseEntity<>(result, HttpStatus.BAD_REQUEST);
        }
        return new ResponseEntity<>(result, HttpStatus.OK);
    }
}
