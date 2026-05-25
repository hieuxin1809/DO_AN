package com.web.api;

import com.web.dto.CustomerProfileDTO;
import com.web.dto.DoctorDTO;
import com.web.entity.CustomerProfile;
import com.web.entity.CustomerSchedule;
import com.web.entity.Doctor;
import com.web.entity.User;
import com.web.entity.VaccinationCertificate;
import com.web.enums.StatusCustomerSchedule;
import com.web.exception.MessageException;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.DoctorRepository;
import com.web.service.DoctorService;
import com.web.service.VaccinationCertificateService;
import com.web.utils.UserUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctor")
@CrossOrigin
public class DoctorApi {

    @Autowired
    private DoctorService doctorService;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private CustomerScheduleRepository customerScheduleRepository;

    @Autowired
    private UserUtils userUtils;

    @Autowired
    private VaccinationCertificateService certService;

    @GetMapping("/public/find-all")
    public ResponseEntity<?> findAll(){
        List<Doctor> result = doctorService.findAll();
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    /* -----------ADMIN-----------*/

    /* Get list doctor*/
    @GetMapping("/admin/list-doctor")
    public ResponseEntity<?> findAllDoctor(@RequestParam(required = false) String q, Pageable pageable){
        Page<DoctorDTO> result = doctorService.getDoctors(q, pageable);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    /* update doctor*/
    @PutMapping("/admin/update/{id}")
    public ResponseEntity<?> updateCustomerProfile(@PathVariable("id") Long id, @RequestBody Doctor doctor){
        DoctorDTO doctorUpdated = doctorService.updateDoctor(id, doctor);
        return new ResponseEntity<>(doctorUpdated, HttpStatus.OK);
    }

    /* Delete a doctor*/
    @DeleteMapping("/admin/delete/{id}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable("id") Long id){
        doctorService.deleteDoctor(id);
        return ResponseEntity.ok().build();
    }
    /* -----------ADMIN-----------*/

    /* ═══════════════════════════════════════════════════════════════
       DOCTOR — Endpoints cho doctor đang login
       Lấy doctor entity từ User trong JWT
       ═══════════════════════════════════════════════════════════════ */

    /** Lấy Doctor entity tương ứng với user đang login */
    private Doctor currentDoctor() {
        User user = userUtils.getUserWithAuthority();
        if (user == null) throw new MessageException("Vui lòng đăng nhập!");
        return doctorRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new MessageException("Không tìm thấy hồ sơ bác sĩ cho tài khoản này!"));
    }

    /** GET /api/doctor/stats — KPI cá nhân */
    @GetMapping("/doctor/stats")
    public ResponseEntity<?> myStats() {
        Doctor doc = currentDoctor();
        LocalDate today = LocalDate.now();

        // Lấy toàn bộ lịch tiêm thuộc doctor này
        List<CustomerSchedule> all = customerScheduleRepository.findAll().stream()
                .filter(cs -> cs.getDoctor() != null && Objects.equals(cs.getDoctor().getId(), doc.getId()))
                .collect(Collectors.toList());

        long todayCount = all.stream()
                .filter(cs -> cs.getVaccineScheduleTime() != null
                        && cs.getVaccineScheduleTime().getInjectDate() != null
                        && cs.getVaccineScheduleTime().getInjectDate().toLocalDate().equals(today))
                .count();

        long todayInjected = all.stream()
                .filter(cs -> cs.getStatusCustomerSchedule() == StatusCustomerSchedule.injected
                        || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.finished)
                .filter(cs -> cs.getCompletedDate() != null
                        && cs.getCompletedDate().toLocalDateTime().toLocalDate().equals(today))
                .count();

        LocalDate weekAgo = today.minusDays(7);
        long weekInjected = all.stream()
                .filter(cs -> cs.getStatusCustomerSchedule() == StatusCustomerSchedule.injected
                        || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.finished)
                .filter(cs -> cs.getCompletedDate() != null
                        && !cs.getCompletedDate().toLocalDateTime().toLocalDate().isBefore(weekAgo))
                .count();

        LocalDate monthStart = today.withDayOfMonth(1);
        long monthInjected = all.stream()
                .filter(cs -> cs.getStatusCustomerSchedule() == StatusCustomerSchedule.injected
                        || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.finished)
                .filter(cs -> cs.getCompletedDate() != null
                        && !cs.getCompletedDate().toLocalDateTime().toLocalDate().isBefore(monthStart))
                .count();

        long totalInjected = all.stream()
                .filter(cs -> cs.getStatusCustomerSchedule() == StatusCustomerSchedule.injected
                        || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.finished)
                .count();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("todayCount", todayCount);
        out.put("todayInjected", todayInjected);
        out.put("weekInjected", weekInjected);
        out.put("monthInjected", monthInjected);
        out.put("totalInjected", totalInjected);
        return new ResponseEntity<>(out, HttpStatus.OK);
    }

    /** GET /api/doctor/stats-by-day?days=7 — chart 7 ngày qua */
    @GetMapping("/doctor/stats-by-day")
    public ResponseEntity<?> statsByDay(@RequestParam(defaultValue = "7") int days) {
        Doctor doc = currentDoctor();
        LocalDate today = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM");

        List<CustomerSchedule> injected = customerScheduleRepository.findAll().stream()
                .filter(cs -> cs.getDoctor() != null && Objects.equals(cs.getDoctor().getId(), doc.getId()))
                .filter(cs -> cs.getStatusCustomerSchedule() == StatusCustomerSchedule.injected
                        || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.finished)
                .filter(cs -> cs.getCompletedDate() != null)
                .collect(Collectors.toList());

        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            long count = injected.stream()
                    .filter(cs -> cs.getCompletedDate().toLocalDateTime().toLocalDate().equals(d))
                    .count();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("date", d.toString());
            item.put("label", d.format(fmt));
            item.put("count", count);
            out.add(item);
        }
        return new ResponseEntity<>(out, HttpStatus.OK);
    }

    /** GET /api/doctor/stats-by-vaccine — pie chart loại vaccine */
    @GetMapping("/doctor/stats-by-vaccine")
    public ResponseEntity<?> statsByVaccine() {
        Doctor doc = currentDoctor();
        Map<String, Long> counts = new LinkedHashMap<>();
        customerScheduleRepository.findAll().stream()
                .filter(cs -> cs.getDoctor() != null && Objects.equals(cs.getDoctor().getId(), doc.getId()))
                .filter(cs -> cs.getStatusCustomerSchedule() == StatusCustomerSchedule.injected
                        || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.finished)
                .forEach(cs -> {
                    try {
                        String name = cs.getVaccineScheduleTime().getVaccineSchedule().getVaccine().getName();
                        counts.merge(name, 1L, Long::sum);
                    } catch (Exception ignore) {}
                });
        List<Map<String, Object>> out = counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("vaccineName", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
        return new ResponseEntity<>(out, HttpStatus.OK);
    }

    /** GET /api/doctor/today-queue?date=yyyy-MM-dd
     *  Danh sách KH cần tiêm:
     *   - Mặc định: hôm nay + tương lai (lịch sắp tới của tôi)
     *   - Có ?date=... : chỉ ngày đó
     */
    @GetMapping("/doctor/today-queue")
    public ResponseEntity<?> todayQueue(@RequestParam(required = false) String date) {
        Doctor doc = currentDoctor();
        LocalDate today = LocalDate.now();
        LocalDate exactDate = null;
        if (date != null && !date.isBlank()) {
            try { exactDate = LocalDate.parse(date); } catch (Exception ignore) {}
        }
        final LocalDate filterDate = exactDate;

        List<CustomerSchedule> out = customerScheduleRepository.findAll().stream()
                .filter(cs -> cs.getDoctor() != null && Objects.equals(cs.getDoctor().getId(), doc.getId()))
                // Chỉ confirmed + injected + finished (đã tiêm hoặc đang chờ tiêm)
                .filter(cs -> cs.getStatusCustomerSchedule() == StatusCustomerSchedule.confirmed
                           || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.injected
                           || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.finished
                           || cs.getStatusCustomerSchedule() == StatusCustomerSchedule.not_injected)
                .filter(cs -> cs.getVaccineScheduleTime() != null
                        && cs.getVaccineScheduleTime().getInjectDate() != null)
                .filter(cs -> {
                    LocalDate d = cs.getVaccineScheduleTime().getInjectDate().toLocalDate();
                    if (filterDate != null) return d.equals(filterDate);
                    // Mặc định: hôm nay HOẶC tương lai (lịch sắp tới)
                    return !d.isBefore(today);
                })
                .sorted(Comparator.comparing((CustomerSchedule cs) -> cs.getVaccineScheduleTime().getInjectDate())
                        .thenComparing(cs -> {
                            try { return cs.getVaccineScheduleTime().getStart().toString(); }
                            catch (Exception e) { return ""; }
                        }))
                .collect(Collectors.toList());
        return new ResponseEntity<>(out, HttpStatus.OK);
    }

    /** GET /api/doctor/my-patients — toàn bộ KH doctor đã/đang phụ trách */
    @GetMapping("/doctor/my-patients")
    public ResponseEntity<?> myPatients() {
        Doctor doc = currentDoctor();
        List<CustomerSchedule> out = customerScheduleRepository.findAll().stream()
                .filter(cs -> cs.getDoctor() != null && Objects.equals(cs.getDoctor().getId(), doc.getId()))
                .sorted(Comparator.comparing(CustomerSchedule::getCreatedDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        return new ResponseEntity<>(out, HttpStatus.OK);
    }

    /** POST /api/doctor/screening/{customerScheduleId} — sàng lọc + tiêm/hoãn */
    @PostMapping("/doctor/screening/{customerScheduleId}")
    public ResponseEntity<?> screening(@PathVariable Long customerScheduleId,
                                       @RequestBody Map<String, Object> body) {
        Doctor doc = currentDoctor();
        CustomerSchedule cs = customerScheduleRepository.findById(customerScheduleId)
                .orElseThrow(() -> new MessageException("Không tìm thấy lịch tiêm!"));

        // Kiểm tra đúng doctor
        if (cs.getDoctor() == null || !Objects.equals(cs.getDoctor().getId(), doc.getId())) {
            throw new MessageException("Lịch tiêm này không thuộc về bạn!");
        }

        // Validate: chỉ cho phép thao tác đúng ngày hẹn (tránh tiêm sai ngày)
        if (cs.getVaccineScheduleTime() == null || cs.getVaccineScheduleTime().getInjectDate() == null) {
            throw new MessageException("Lịch tiêm thiếu thông tin ngày tiêm!");
        }
        LocalDate injectDate = cs.getVaccineScheduleTime().getInjectDate().toLocalDate();
        LocalDate today      = LocalDate.now();
        if (injectDate.isAfter(today)) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(today, injectDate);
            throw new MessageException("Chưa đến ngày tiêm! Còn " + days + " ngày nữa (ngày hẹn: " + injectDate + ")");
        }
        if (injectDate.isBefore(today)) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(injectDate, today);
            throw new MessageException("Lịch đã quá hạn " + days + " ngày. Vui lòng yêu cầu KH đặt lại lịch mới.");
        }

        // Validate: chỉ tiêm cho lịch confirmed
        if (cs.getStatusCustomerSchedule() != StatusCustomerSchedule.confirmed) {
            throw new MessageException("Chỉ có thể sàng lọc lịch ở trạng thái 'Đã duyệt'!");
        }

        String decision = String.valueOf(body.get("decision"));
        Object screeningObj = body.get("screening");

        // Lưu screening JSON vào healthStatusBefore
        try {
            String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(screeningObj);
            cs.setHealthStatusBefore(json);
        } catch (Exception ignore) {}

        if ("inject".equalsIgnoreCase(decision)) {
            cs.setStatusCustomerSchedule(StatusCustomerSchedule.injected);
            cs.setCompletedDate(new Timestamp(System.currentTimeMillis()));
            customerScheduleRepository.save(cs);

            // Tạo cert
            try {
                VaccinationCertificate cert = certService.generateAfterInjection(cs.getId());
                certService.sendCertificateEmail(cert);
            } catch (Exception e) {
                System.err.println("[Doctor.screening] Cert error: " + e.getMessage());
            }
        } else if ("defer".equalsIgnoreCase(decision)) {
            cs.setStatusCustomerSchedule(StatusCustomerSchedule.not_injected);
            cs.setCompletedDate(new Timestamp(System.currentTimeMillis()));
            customerScheduleRepository.save(cs);
        } else {
            throw new MessageException("Decision không hợp lệ (inject hoặc defer)");
        }

        return new ResponseEntity<>(cs, HttpStatus.OK);
    }

    /** POST /api/doctor/doctor/followup/{customerScheduleId}
     *  Theo dõi sau tiêm — lưu JSON vào healthStatusAfter + chuyển status = finished
     */
    @PostMapping("/doctor/followup/{customerScheduleId}")
    public ResponseEntity<?> followup(@PathVariable Long customerScheduleId,
                                      @RequestBody Map<String, Object> body) {
        Doctor doc = currentDoctor();
        CustomerSchedule cs = customerScheduleRepository.findById(customerScheduleId)
                .orElseThrow(() -> new MessageException("Không tìm thấy lịch tiêm!"));

        if (cs.getDoctor() == null || !Objects.equals(cs.getDoctor().getId(), doc.getId())) {
            throw new MessageException("Lịch tiêm này không thuộc về bạn!");
        }
        if (cs.getStatusCustomerSchedule() != StatusCustomerSchedule.injected) {
            throw new MessageException("Chỉ theo dõi sau tiêm cho lịch đã 'Đã tiêm'!");
        }

        try {
            String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(body);
            cs.setHealthStatusAfter(json);
        } catch (Exception ignore) {}

        cs.setStatusCustomerSchedule(StatusCustomerSchedule.finished);
        customerScheduleRepository.save(cs);
        return new ResponseEntity<>(cs, HttpStatus.OK);
    }

    /** GET /api/doctor/profile — hồ sơ cá nhân */
    @GetMapping("/doctor/profile")
    public ResponseEntity<?> myProfile() {
        Doctor doc = currentDoctor();
        return new ResponseEntity<>(doc, HttpStatus.OK);
    }

    /** POST /api/doctor/profile — update hồ sơ */
    @PostMapping("/doctor/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> body) {
        Doctor doc = currentDoctor();
        if (body.get("fullName") != null) doc.setFullName(String.valueOf(body.get("fullName")));
        if (body.get("specialization") != null) doc.setSpecialization(String.valueOf(body.get("specialization")));
        if (body.get("bio") != null) doc.setBio(String.valueOf(body.get("bio")));
        if (body.get("avatar") != null) doc.setAvatar(String.valueOf(body.get("avatar")));
        if (body.get("experienceYears") != null) {
            try { doc.setExperienceYears(Integer.parseInt(String.valueOf(body.get("experienceYears")))); }
            catch (Exception ignore) {}
        }
        doctorRepository.save(doc);
        return new ResponseEntity<>(doc, HttpStatus.OK);
    }
}
