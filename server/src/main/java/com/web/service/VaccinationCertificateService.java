package com.web.service;

import com.web.entity.*;
import com.web.enums.StatusCustomerSchedule;
import com.web.exception.MessageException;
import com.web.repository.CustomerProfileRepository;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.VaccinationCertificateRepository;
import com.web.utils.EmailTemplateUtils;
import com.web.utils.MailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Component
public class VaccinationCertificateService {

    /** Secret cho hash — production nên cấu hình qua env, ở đây hardcode tạm */
    private static final String HASH_SECRET = "ivaccine-cert-2026-secret-key";

    @Value("${url.frontend:http://localhost:3000}")
    private String frontendUrl;

    @Autowired
    private VaccinationCertificateRepository certRepository;

    @Autowired
    private CustomerScheduleRepository customerScheduleRepository;

    @Autowired
    private CustomerProfileRepository customerProfileRepository;

    @Autowired
    private MailService mailService;

    /* ──────────────────────────────────────────────────────────────
       Tạo cert tự động khi mũi tiêm được đánh dấu "injected".
       Cert là IMMUTABLE — đã tồn tại thì trả về nguyên trạng,
       KHÔNG sửa data dù profile user có cập nhật về sau.
       (Tính chất "snapshot tại thời điểm cấp" — chuẩn audit.)
       ────────────────────────────────────────────────────────────── */
    @Transactional
    public VaccinationCertificate generateAfterInjection(Long customerScheduleId) {
        Optional<VaccinationCertificate> existing = certRepository.findByCustomerScheduleId(customerScheduleId);
        if (existing.isPresent()) return existing.get();

        CustomerSchedule cs = customerScheduleRepository.findById(customerScheduleId)
                .orElseThrow(() -> new MessageException("Không tìm thấy lịch tiêm #" + customerScheduleId));

        if (cs.getStatusCustomerSchedule() != StatusCustomerSchedule.injected
                && cs.getStatusCustomerSchedule() != StatusCustomerSchedule.finished) {
            throw new MessageException("Chỉ tạo giấy xác nhận cho mũi đã được đánh dấu là đã tiêm!");
        }

        VaccinationCertificate cert = new VaccinationCertificate();

        /* ─── Lấy profile (nếu có) để ưu tiên cho self-booking ─── */
        com.web.entity.CustomerProfile profile = null;
        if (cs.getUser() != null) {
            cert.setEmailSnapshot(cs.getUser().getEmail());
            try {
                profile = customerProfileRepository.findByUser(cs.getUser().getId());
            } catch (Exception ignore) {}
        }
        boolean forOther = Boolean.TRUE.equals(cs.getBookingForOther());

        /* ─── Người tiêm ─── */
        cert.setFullNameSnapshot(preferProfile(forOther, profile == null ? null : profile.getFullName(), cs.getFullName()));
        cert.setBirthdateSnapshot(forOther
                ? cs.getDob()
                : (profile != null && profile.getBirthdate() != null ? profile.getBirthdate() : cs.getDob()));
        cert.setPhoneSnapshot(preferProfile(forOther, profile == null ? null : profile.getPhone(), cs.getPhone()));
        cert.setIdCardSnapshot(preferProfile(forOther, profile == null ? null : profile.getIdCard(), cs.getIdCard()));

        /* Địa chỉ: ưu tiên ghép đầy đủ từ profile, fallback cs.address */
        cert.setAddressSnapshot(resolveAddress(cs, profile));

        /* ─── Vaccine ─── */
        Vaccine vaccine = null;
        Center center = null;
        try {
            VaccineScheduleTime vst = cs.getVaccineScheduleTime();
            if (vst != null && vst.getVaccineSchedule() != null) {
                vaccine = vst.getVaccineSchedule().getVaccine();
                center  = vst.getVaccineSchedule().getCenter();
            }
        } catch (Exception ignore) {}

        if (vaccine != null) {
            cert.setVaccineName(vaccine.getName());
            cert.setVaccineManufacturer(vaccine.getManufacturer() != null ? vaccine.getManufacturer().getName() : null);
            cert.setVaccineType(vaccine.getVaccineType() != null ? vaccine.getVaccineType().getTypeName() : null);
            cert.setTotalDoses(vaccine.getMaxDose());

            // Tính dose number = số mũi đã tiêm cùng vaccine này của user
            cert.setDoseNumber(calculateDoseNumber(cs));
        }

        /* ─── Center ─── */
        if (center != null) {
            cert.setCenterName(center.getCenterName());
            cert.setCenterAddress(joinAddress(center.getStreet(), center.getWard(), center.getDistrict(), center.getCity()));
        }

        /* ─── Doctor / Nurse ─── */
        if (cs.getDoctor() != null) cert.setDoctorName(cs.getDoctor().getFullName());
        if (cs.getNurse()  != null) cert.setNurseName(cs.getNurse().getFullName());

        /* ─── Thời gian ─── */
        cert.setInjectionDate(cs.getCompletedDate() != null ? cs.getCompletedDate() : new Timestamp(System.currentTimeMillis()));
        cert.setIssuedDate(new Timestamp(System.currentTimeMillis()));

        cert.setCustomerScheduleId(customerScheduleId);
        cert.setRevoked(false);
        cert.setFrozen(true);     // immutable từ thời điểm cấp
        cert.setFrozenDate(new Timestamp(System.currentTimeMillis()));

        // Sinh serialNo TRƯỚC khi save (vì cột NOT NULL).
        // Retry tối đa 5 lần phòng trường hợp trùng do race condition.
        for (int attempt = 0; attempt < 5; attempt++) {
            String serial = generateSerialNo();
            if (certRepository.findBySerialNo(serial).isPresent()) continue;
            cert.setSerialNo(serial);
            break;
        }
        if (cert.getSerialNo() == null) {
            throw new MessageException("Không sinh được số serial unique sau 5 lần thử");
        }
        cert.setHash(computeHash(cert));
        return certRepository.save(cert);
    }

    /* ─── Tính số mũi: đếm số mũi cùng vaccine đã inject/finished của user ─── */
    private int calculateDoseNumber(CustomerSchedule current) {
        try {
            Vaccine vaccine = current.getVaccineScheduleTime().getVaccineSchedule().getVaccine();
            if (vaccine == null || current.getUser() == null) return 1;
            Long userId = current.getUser().getId();
            Long vaccineId = vaccine.getId();
            // Đếm số mũi đã inject của user cho vaccine này, tính đến ngày hiện tại
            List<CustomerSchedule> all = customerScheduleRepository.findAllByUserId(userId);
            int count = 0;
            for (CustomerSchedule s : all) {
                if (s.getStatusCustomerSchedule() != StatusCustomerSchedule.injected
                        && s.getStatusCustomerSchedule() != StatusCustomerSchedule.finished) continue;
                try {
                    Long vId = s.getVaccineScheduleTime().getVaccineSchedule().getVaccine().getId();
                    if (vaccineId.equals(vId)) count++;
                } catch (Exception ignore) {}
            }
            return Math.max(count, 1);
        } catch (Exception e) {
            return 1;
        }
    }

    /** Chọn giá trị nên hiển thị trên cert.
     *  - Nếu booking-for-other (con/người thân): luôn giữ giá trị từ CustomerSchedule (đúng patient)
     *  - Nếu self-booking: ưu tiên profile (cập nhật mới nhất), fallback cs */
    private String preferProfile(boolean forOther, String profileVal, String csVal) {
        if (forOther) {
            return notEmpty(csVal) ? csVal : profileVal;
        }
        return notEmpty(profileVal) ? profileVal : csVal;
    }
    private boolean notEmpty(String s) { return s != null && !s.trim().isEmpty(); }

    private String joinAddress(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p == null || p.isEmpty()) continue;
            if (sb.length() > 0) sb.append(", ");
            sb.append(p);
        }
        return sb.toString();
    }

    /** Trả về địa chỉ đầy đủ. Ưu tiên ghép từ profile (4 trường có cấu trúc),
     *  chỉ dùng cs.address nếu profile rỗng/không đủ chi tiết. */
    private String resolveAddress(CustomerSchedule cs, com.web.entity.CustomerProfile profile) {
        String profileFull = profile == null ? "" : joinAddress(
                profile.getStreet(), profile.getWard(), profile.getDistrict(), profile.getCity());
        String csAddr = cs == null || cs.getAddress() == null ? "" : cs.getAddress().trim();

        // Profile có >=2 phần (vd "Quận X, Hà Nội") → coi như "đủ đầy", ưu tiên dùng
        if (profileFull.contains(",")) return profileFull;
        // Profile chỉ có 1 phần (vd chỉ "Hà Nội"), nhưng cs có nhiều phần hơn → dùng cs
        if (csAddr.contains(",")) return csAddr;
        // Cả 2 đều rút gọn → cái nào dài hơn dùng
        return profileFull.length() >= csAddr.length() ? profileFull : csAddr;
    }

    /* ─── Serial format: IV-YYYY-NNNNNNNN (8 chữ số random + năm) ─── */
    private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();
    private String generateSerialNo() {
        int year = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR);
        int suffix = 10000000 + RANDOM.nextInt(90000000); // 8 chữ số: 10000000-99999999
        return String.format("IV-%d-%d", year, suffix);
    }

    /* ─── Hash các trường quan trọng + secret để chống sửa ─── */
    public String computeHash(VaccinationCertificate cert) {
        try {
            String payload = String.join("|",
                    nz(cert.getSerialNo()),
                    String.valueOf(cert.getCustomerScheduleId()),
                    nz(cert.getFullNameSnapshot()),
                    cert.getBirthdateSnapshot() != null ? cert.getBirthdateSnapshot().toString() : "",
                    nz(cert.getIdCardSnapshot()),
                    nz(cert.getVaccineName()),
                    String.valueOf(cert.getDoseNumber()),
                    cert.getInjectionDate() != null ? cert.getInjectionDate().toString() : "",
                    HASH_SECRET
            );
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = md.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hashBytes) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            return null;
        }
    }
    private String nz(String s) { return s == null ? "" : s; }

    /* ──────────────────────────────────────────────────────────────
       Tìm cert theo serial — dùng cho trang verify public
       ────────────────────────────────────────────────────────────── */
    public Optional<VaccinationCertificate> findBySerial(String serialNo) {
        return certRepository.findBySerialNo(serialNo);
    }

    public Optional<VaccinationCertificate> findByCustomerScheduleId(Long csId) {
        return certRepository.findByCustomerScheduleId(csId);
    }

    /* ──────────────────────────────────────────────────────────────
       Verify: cert tồn tại + chưa thu hồi + hash khớp
       ────────────────────────────────────────────────────────────── */
    public boolean verify(VaccinationCertificate cert) {
        if (cert == null) return false;
        if (Boolean.TRUE.equals(cert.getRevoked())) return false;
        String expectedHash = computeHash(cert);
        return expectedHash != null && expectedHash.equals(cert.getHash());
    }

    /* ──────────────────────────────────────────────────────────────
       Admin: thu hồi giấy với lý do
       ────────────────────────────────────────────────────────────── */
    @Transactional
    public VaccinationCertificate revokeCert(Long certId, String reason, String revokedByEmail) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new MessageException("Vui lòng nhập lý do thu hồi!");
        }
        VaccinationCertificate cert = certRepository.findById(certId)
                .orElseThrow(() -> new MessageException("Không tìm thấy giấy xác nhận!"));
        if (Boolean.TRUE.equals(cert.getRevoked())) {
            throw new MessageException("Giấy này đã bị thu hồi từ trước!");
        }
        cert.setRevoked(true);
        cert.setRevokedReason(reason.trim());
        cert.setRevokedBy(revokedByEmail);
        cert.setRevokedDate(new Timestamp(System.currentTimeMillis()));
        return certRepository.save(cert);
    }

    /* ──────────────────────────────────────────────────────────────
       Admin: tìm cert theo ID (cho trang chi tiết)
       ────────────────────────────────────────────────────────────── */
    public Optional<VaccinationCertificate> findById(Long id) {
        return certRepository.findById(id);
    }

    /* ──────────────────────────────────────────────────────────────
       Gửi email thông báo + link tải giấy
       ────────────────────────────────────────────────────────────── */
    public void sendCertificateEmail(VaccinationCertificate cert) {
        if (cert == null || cert.getEmailSnapshot() == null || cert.getEmailSnapshot().isEmpty()) return;
        try {
            String verifyUrl = frontendUrl + "/verify/" + cert.getSerialNo();
            String downloadHint = frontendUrl + "/lich-da-dang-ky";
            String body = EmailTemplateUtils.certificateIssued(
                    cert.getFullNameSnapshot(),
                    cert.getVaccineName(),
                    cert.getSerialNo(),
                    verifyUrl,
                    downloadHint
            );
            mailService.sendEmail(cert.getEmailSnapshot(),
                    "[iVaccine] Giấy xác nhận tiêm chủng #" + cert.getSerialNo(),
                    body, false, true);
        } catch (Exception e) {
            System.err.println("[Cert] gửi email thất bại: " + e.getMessage());
        }
    }
}
