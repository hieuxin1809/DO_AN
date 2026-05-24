package com.web.api;

import com.web.entity.User;
import com.web.entity.VaccinationCertificate;
import com.web.exception.MessageException;
import com.web.repository.CustomerScheduleRepository;
import com.web.service.VaccinationCertificateService;
import com.web.utils.UserUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
            result.put("reason", Boolean.TRUE.equals(cert.getRevoked())
                    ? "Giấy đã bị thu hồi"
                    : "Dữ liệu giấy không khớp chữ ký số (có thể đã bị sửa)");
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
}
