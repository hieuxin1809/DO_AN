package com.web.api;

import com.web.entity.User;
import com.web.entity.VaccinationCertificate;
import com.web.exception.MessageException;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.VaccinationCertificateRepository;
import com.web.service.VaccinationCertificateService;
import com.web.utils.UserUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/certificate")
@CrossOrigin
public class VaccinationCertificateApi {

    @Autowired
    private VaccinationCertificateService certService;

    @Autowired
    private CustomerScheduleRepository customerScheduleRepository;

    @Autowired
    private VaccinationCertificateRepository certRepository;

    @Autowired
    private UserUtils userUtils;

    /* ──────────────────────────────────────────────────────────────
       Khách hàng lấy thông tin cert theo customer_schedule_id.
       FE dùng dữ liệu này để render PDF + QR code.
       Chỉ chủ sở hữu lịch tiêm mới xem được.
       ────────────────────────────────────────────────────────────── */
    @GetMapping("/customer/by-schedule/{customerScheduleId}")
    public ResponseEntity<?> getByScheduleId(@PathVariable Long customerScheduleId) {
        User loggedIn = userUtils.getUserWithAuthority();
        if (loggedIn == null) throw new MessageException("Vui lòng đăng nhập!");

        var csOpt = customerScheduleRepository.findById(customerScheduleId);
        if (csOpt.isEmpty()) throw new MessageException("Không tìm thấy lịch tiêm!");
        var cs = csOpt.get();
        if (cs.getUser() == null || !cs.getUser().getId().equals(loggedIn.getId())) {
            throw new MessageException("Bạn không có quyền xem giấy xác nhận này!");
        }

        // Tạo cert nếu chưa có (idempotent — chỉ tạo khi đã inject)
        VaccinationCertificate cert = certService.generateAfterInjection(customerScheduleId);
        return new ResponseEntity<>(cert, HttpStatus.OK);
    }

    /* ──────────────────────────────────────────────────────────────
       Verify cert public — không cần đăng nhập.
       Trả về thông tin tóm tắt + valid/invalid.
       Cert luôn immutable nên không cần side effect gì cả.
       ────────────────────────────────────────────────────────────── */
    @GetMapping("/public/verify/{serialNo}")
    public ResponseEntity<?> verify(@PathVariable String serialNo) {
        Optional<VaccinationCertificate> opt = certService.findBySerial(serialNo);
        Map<String, Object> result = new HashMap<>();

        if (opt.isEmpty()) {
            result.put("valid", false);
            result.put("reason", "Mã giấy không tồn tại trong hệ thống");
            return new ResponseEntity<>(result, HttpStatus.OK);
        }

        VaccinationCertificate cert = opt.get();
        boolean valid = certService.verify(cert);
        result.put("valid", valid);
        result.put("serialNo", cert.getSerialNo());
        if (!valid) {
            if (Boolean.TRUE.equals(cert.getRevoked())) {
                String r = "Giấy đã bị thu hồi";
                if (cert.getRevokedReason() != null && !cert.getRevokedReason().isEmpty()) {
                    r += " — " + cert.getRevokedReason();
                }
                result.put("reason", r);
                result.put("revokedDate", cert.getRevokedDate());
            } else {
                result.put("reason", "Dữ liệu giấy không khớp chữ ký số (có thể đã bị sửa)");
            }
        }

        // Thông tin tóm tắt (không trả full để tránh leak)
        Map<String, Object> data = new HashMap<>();
        data.put("fullName", cert.getFullNameSnapshot());
        data.put("idCard", maskIdCard(cert.getIdCardSnapshot()));   // mask để bảo mật
        data.put("vaccineName", cert.getVaccineName());
        data.put("vaccineManufacturer", cert.getVaccineManufacturer());
        data.put("doseNumber", cert.getDoseNumber());
        data.put("totalDoses", cert.getTotalDoses());
        data.put("injectionDate", cert.getInjectionDate());
        data.put("centerName", cert.getCenterName());
        data.put("issuedDate", cert.getIssuedDate());
        result.put("data", data);

        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    /** Mask CMND: chỉ hiện 3 số đầu + 3 số cuối, vd "012******789" */
    private String maskIdCard(String idCard) {
        if (idCard == null || idCard.length() < 6) return idCard;
        int keep = 3;
        return idCard.substring(0, keep)
                + "*".repeat(idCard.length() - keep * 2)
                + idCard.substring(idCard.length() - keep);
    }

    /* ══════════════════════════════════════════════════════════════
       ADMIN — Quản lý giấy chứng nhận
       ══════════════════════════════════════════════════════════════ */

    /** GET /api/certificate/admin/list — list với filter + pagination */
    @GetMapping("/admin/list")
    public ResponseEntity<?> adminList(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String vaccineName,
            @RequestParam(required = false) String centerName,
            @RequestParam(required = false) Boolean revoked,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Timestamp from = parseDateStart(fromDate);
        Timestamp to   = parseDateEnd(toDate);
        String kw  = nullIfBlank(keyword);
        String vn  = nullIfBlank(vaccineName);
        String cn  = nullIfBlank(centerName);
        Page<VaccinationCertificate> p = certRepository.searchAdmin(
                kw, vn, cn, revoked, from, to, PageRequest.of(page, size));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", p.getContent());
        body.put("totalElements", p.getTotalElements());
        body.put("totalPages", p.getTotalPages());
        body.put("page", p.getNumber());
        body.put("size", p.getSize());

        // Stats nhỏ kèm
        body.put("totalActive", certRepository.countActive());
        body.put("totalRevoked", certRepository.countRevoked());

        return new ResponseEntity<>(body, HttpStatus.OK);
    }

    /** GET /api/certificate/admin/detail/{id} — chi tiết cert (full data) */
    @GetMapping("/admin/detail/{id}")
    public ResponseEntity<?> adminDetail(@PathVariable Long id) {
        VaccinationCertificate cert = certService.findById(id)
                .orElseThrow(() -> new MessageException("Không tìm thấy giấy xác nhận!"));
        return new ResponseEntity<>(cert, HttpStatus.OK);
    }

    /** POST /api/certificate/admin/revoke/{id} — thu hồi với lý do */
    @PostMapping("/admin/revoke/{id}")
    public ResponseEntity<?> adminRevoke(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User loggedIn = userUtils.getUserWithAuthority();
        if (loggedIn == null) throw new MessageException("Vui lòng đăng nhập!");
        String reason = body == null ? null : body.get("reason");
        VaccinationCertificate cert = certService.revokeCert(id, reason, loggedIn.getEmail());
        return new ResponseEntity<>(cert, HttpStatus.OK);
    }

    /**
     * POST /api/certificate/admin/rehash-legacy
     * Migration one-shot: tính lại hash cho các cert legacy bị sai
     * (do bug ms-precision của Timestamp trước khi fix hash function).
     * Không thay đổi nội dung cert — chỉ rewrite trường hash cho khớp.
     */
    @PostMapping("/admin/rehash-legacy")
    public ResponseEntity<?> adminRehashLegacy() {
        User loggedIn = userUtils.getUserWithAuthority();
        if (loggedIn == null) throw new MessageException("Vui lòng đăng nhập!");
        int count = certService.rehashLegacyCertificates();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("rehashed", count);
        body.put("message", "Đã cập nhật hash cho " + count + " giấy chứng nhận legacy.");
        return new ResponseEntity<>(body, HttpStatus.OK);
    }

    /** POST /api/certificate/admin/rehash/{id} — rehash 1 cert cụ thể */
    @PostMapping("/admin/rehash/{id}")
    public ResponseEntity<?> adminRehashOne(@PathVariable Long id) {
        User loggedIn = userUtils.getUserWithAuthority();
        if (loggedIn == null) throw new MessageException("Vui lòng đăng nhập!");
        VaccinationCertificate cert = certService.rehashOne(id);
        return new ResponseEntity<>(cert, HttpStatus.OK);
    }

    /* ─── helpers ─── */
    private static String nullIfBlank(String s) {
        return (s == null || s.trim().isEmpty()) ? null : s.trim();
    }
    private static Timestamp parseDateStart(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Timestamp.valueOf(LocalDate.parse(s).atStartOfDay()); }
        catch (Exception e) { return null; }
    }
    private static Timestamp parseDateEnd(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Timestamp.valueOf(LocalDate.parse(s).atTime(23, 59, 59)); }
        catch (Exception e) { return null; }
    }
}
