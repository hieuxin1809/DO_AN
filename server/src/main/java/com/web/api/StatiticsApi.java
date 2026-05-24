package com.web.api;

import com.web.dto.VaccineRes;
import com.web.entity.CustomerSchedule;
import com.web.entity.Payment;
import com.web.entity.Vaccine;
import com.web.enums.StatusCustomerSchedule;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.PaymentRepository;
import com.web.repository.UserRepository;
import com.web.repository.VaccineRepository;
import com.web.utils.Contains;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/statistic")
public class StatiticsApi {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private VaccineRepository vaccineRepository;

    @Autowired
    private CustomerScheduleRepository customerScheduleRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/admin/revenue-year")
    public List<Double> doanhThu(@RequestParam("year") Integer year){
        List<Double> list = new ArrayList<>();
        for(int i=1; i< 13; i++){
            Double sum = paymentRepository.calDt(i, year);
            if(sum == null){
                sum = 0D;
            }
            list.add(sum);
        }
        return list;
    }

    @GetMapping("/admin/vaccine-bc")
    public List<VaccineRes> vaccineRes(){
        List<VaccineRes> list = new ArrayList<>();
        List<Vaccine> vaccines = vaccineRepository.findAll();

        for(Vaccine v : vaccines){
            Integer count = customerScheduleRepository.countRegisByVaccine(v.getId());
            VaccineRes vaccineRes = new VaccineRes();
            vaccineRes.setVaccine(v);
            vaccineRes.setSold(count);
            if(vaccineRes.getSold() != 0){
                list.add(vaccineRes);
            }
        }
        Collections.sort(list, (s1, s2) -> Integer.compare(s2.getSold(), s1.getSold()));
        return list;
    }

    @GetMapping("/admin/thong-ke")
    public ResponseEntity<?> thongKe(){
        Map<String, Object> map = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        Integer year  = today.getYear();
        Integer month = today.getMonthValue();

        /* ─── Doanh thu (existing) ─── */
        Double doanhThuThangNay = paymentRepository.calDt(month, year);
        map.put("doanhThuThangNay", doanhThuThangNay != null ? doanhThuThangNay : 0D);
        Double doanhThuHomNay = paymentRepository.calToday(java.sql.Date.valueOf(today));
        map.put("doanhThuHomNay", doanhThuHomNay != null ? doanhThuHomNay : 0D);

        /* ─── Số lượng tổng thể ─── */
        map.put("nunUser",    userRepository.count());
        map.put("nunVaccine", vaccineRepository.count());

        /* ─── Số lượng theo role ─── */
        map.put("totalCustomers", userRepository.countByRole(Contains.ROLE_CUSTOMER));
        map.put("totalDoctors",   userRepository.countByRole(Contains.ROLE_DOCTOR));
        map.put("totalNurses",    userRepository.countByRole(Contains.ROLE_NURSE));

        /* ─── Số lịch tiêm hôm nay (theo injectDate) ─── */
        map.put("bookingsToday", customerScheduleRepository.countByInjectDate(java.sql.Date.valueOf(today)));

        /* ─── Tỷ lệ hoàn thành tiêm + chi tiết status ─── */
        Map<String, Long> statusCounts = new LinkedHashMap<>();
        for (StatusCustomerSchedule s : StatusCustomerSchedule.values()) statusCounts.put(s.name(), 0L);
        long totalNonCancelled = 0, completed = 0;
        for (Object[] row : customerScheduleRepository.countByStatusGroup()) {
            StatusCustomerSchedule st = (StatusCustomerSchedule) row[0];
            Long cnt = ((Number) row[1]).longValue();
            statusCounts.put(st.name(), cnt);
            if (st != StatusCustomerSchedule.cancelled) totalNonCancelled += cnt;
            if (st == StatusCustomerSchedule.injected || st == StatusCustomerSchedule.finished) completed += cnt;
        }
        map.put("statusCounts", statusCounts);
        double completionRate = totalNonCancelled == 0 ? 0
                : Math.round(((double) completed / totalNonCancelled) * 1000.0) / 10.0; // 1 chữ số thập phân
        map.put("completionRate", completionRate);
        map.put("totalCompleted", completed);
        map.put("totalNonCancelled", totalNonCancelled);

        /* ─── Vaccine sắp hết (inventory <= 10) ─── */
        List<Vaccine> lowStock = vaccineRepository.findLowStock(10);
        List<Map<String, Object>> lowStockOut = new ArrayList<>();
        for (Vaccine v : lowStock) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", v.getId());
            m.put("name", v.getName());
            m.put("inventory", v.getInventory());
            m.put("vaccineType", v.getVaccineType() != null ? v.getVaccineType().getTypeName() : null);
            lowStockOut.add(m);
        }
        map.put("lowStockVaccines", lowStockOut);

        /* ─── Vaccine sắp hết hạn (trong 60 ngày tới) ─── */
        Timestamp now    = new Timestamp(System.currentTimeMillis());
        Timestamp d60    = Timestamp.valueOf(today.plusDays(60).atStartOfDay());
        List<Vaccine> expiring = vaccineRepository.findExpiringSoon(now, d60);
        List<Map<String, Object>> expiringOut = new ArrayList<>();
        for (Vaccine v : expiring) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", v.getId());
            m.put("name", v.getName());
            m.put("expirationDate", v.getExpirationDate());
            long daysLeft = (v.getExpirationDate().getTime() - now.getTime()) / (1000L * 60 * 60 * 24);
            m.put("daysLeft", daysLeft);
            expiringOut.add(m);
        }
        map.put("expiringSoonVaccines", expiringOut);

        return new ResponseEntity<>(map, HttpStatus.OK);
    }
}
