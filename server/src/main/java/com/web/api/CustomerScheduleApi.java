package com.web.api;

import com.web.models.UpdateCustomerSchedule;
import com.web.dto.CustomerScheduleVnpay;
import com.web.dto.PaymentRequest;
import com.web.entity.CustomerSchedule;
import com.web.entity.VaccineSchedule;
import com.web.models.ApproveCustomerScheduleRequest;
import com.web.models.AssignDoctorNurseRequest;
import com.web.models.CreateScheduleGuestRequest;
import com.web.models.ListCustomerScheduleRequest;
import com.web.service.CustomerScheduleService;
import com.web.service.VaccineScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.util.List;

@RestController
@RequestMapping("/api/customer-schedule")
@CrossOrigin
public class CustomerScheduleApi {

    @Autowired
    private CustomerScheduleService customerScheduleService;

    @PostMapping("/customer/create-not-pay")
    public ResponseEntity<?> createNotPay(@RequestBody CustomerSchedule customerSchedule) {
        CustomerSchedule result = customerScheduleService.createNotPay(customerSchedule);
        return new ResponseEntity(result, HttpStatus.CREATED);
    }

    /**
     * POST /api/customer-schedule/customer/reserve
     * Giữ slot 15 phút trong khi user thanh toán.
     * Trả về { customerScheduleId, expiresAt, expiresInSeconds }.
     */
    @PostMapping("/customer/reserve")
    public ResponseEntity<?> reserve(@RequestBody CustomerSchedule customerSchedule) {
        CustomerSchedule reserved = customerScheduleService.createReservation(customerSchedule);
        long expiresAtMs = reserved.getCreatedDate().getTime()
                + com.web.service.CustomerScheduleService.HOLD_MINUTES * 60_000L;
        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("customerScheduleId", reserved.getId());
        body.put("expiresAt", new java.sql.Timestamp(expiresAtMs));
        body.put("expiresInSeconds", Math.max(0, (expiresAtMs - System.currentTimeMillis()) / 1000L));
        return new ResponseEntity<>(body, HttpStatus.CREATED);
    }

    /**
     * POST /api/customer-schedule/customer/cancel-reservation?id=X
     * User chủ động hủy reservation (bỏ giữ chỗ).
     */
    @PostMapping("/customer/cancel-reservation")
    public ResponseEntity<?> cancelReservation(@RequestParam Long id) {
        customerScheduleService.cancelReservation(id);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @PostMapping("/customer/create-vnpay")
    public ResponseEntity<?> createVnPay(@RequestBody CustomerScheduleVnpay customerScheduleVnpay) {
        CustomerSchedule result = customerScheduleService.createVnPay(customerScheduleVnpay);
        return new ResponseEntity(result, HttpStatus.CREATED);
    }

    @PostMapping("/customer/create-momo")
    public ResponseEntity<?> createMomo(@RequestBody CustomerSchedule customerSchedule, @RequestParam String orderId,
                                        @RequestParam String requestId) {
        CustomerSchedule result = customerScheduleService.createMomo(customerSchedule, orderId, requestId);
        return new ResponseEntity(result, HttpStatus.CREATED);
    }

    @GetMapping("/customer/my-schedule")
    public ResponseEntity<?> mySchedule(Pageable pageable, @RequestParam(required = false) String search,
                                        @RequestParam(required = false) Date from, @RequestParam(required = false) Date to,
                                        @RequestParam(required = false) Boolean bookingForOther) {
        Page<CustomerSchedule> result = customerScheduleService.mySchedule(pageable, search, from, to, bookingForOther);
        result.forEach(p->{
            System.out.println(p.getCreatedDate());
        });
        return new ResponseEntity(result, HttpStatus.OK);
    }


    @PostMapping("/customer/cancel")
    public ResponseEntity<?> cancel(@RequestParam Long id) {
        customerScheduleService.cancel(id);
        return new ResponseEntity(HttpStatus.OK);
    }
    @PostMapping("/customer/approve")
    public ResponseEntity<?> approve(@RequestBody ApproveCustomerScheduleRequest request) {
        return new ResponseEntity<>(customerScheduleService.approveCustomerSchedule(request),HttpStatus.OK);
    }
    @PostMapping("/customer/create-guest")
    public ResponseEntity<?> createGuest(@RequestBody CreateScheduleGuestRequest request) {
        return new ResponseEntity<>(customerScheduleService.createScheduleGuest(request),HttpStatus.OK);
    }
    @PostMapping("/customer/list")
    public ResponseEntity<?> list(@RequestBody ListCustomerScheduleRequest request) {
        return new ResponseEntity<>(customerScheduleService.listCustomerSchedule(request),HttpStatus.OK);
    }

    @PostMapping("/customer/finish-payment")
    public ResponseEntity<?> finishPayment(@RequestParam Long id, @RequestBody PaymentRequest paymentRequest) {
        customerScheduleService.finishPayment(id, paymentRequest);
        return new ResponseEntity(HttpStatus.OK);
    }

    @PostMapping("/customer/finish-payment-schedule")
    public ResponseEntity<?> finishPaymentSchedule(@RequestParam Long id, @RequestBody PaymentRequest paymentRequest) {
        customerScheduleService.finishPaymentSchedule(id, paymentRequest);
        return new ResponseEntity(HttpStatus.OK);
    }

    @PostMapping("/customer/change-schedule")
    public ResponseEntity<?> change(@RequestParam Long id, @RequestParam Long timeId) {
        customerScheduleService.change(id, timeId);
        return new ResponseEntity(HttpStatus.OK);
    }

    /**
     * GET /api/customer-schedule/customer/change-history/{id}
     * Lịch sử các lần đổi lịch của 1 customer schedule.
     * Customer chỉ xem được của chính mình.
     */
    @Autowired
    private com.web.utils.UserUtils userUtils;

    @GetMapping("/customer/change-history/{id}")
    public ResponseEntity<?> getChangeHistory(@PathVariable Long id) {
        com.web.entity.User loggedIn = userUtils.getUserWithAuthority();
        if (loggedIn == null) {
            throw new com.web.exception.MessageException("Vui lòng đăng nhập!");
        }
        var cs = customerScheduleService.findOptionalById(id);
        if (cs.isEmpty()) {
            throw new com.web.exception.MessageException("Không tìm thấy lịch tiêm!");
        }
        if (cs.get().getUser() == null || !cs.get().getUser().getId().equals(loggedIn.getId())) {
            throw new com.web.exception.MessageException("Bạn không có quyền xem lịch sử này!");
        }
        return new ResponseEntity<>(customerScheduleService.getChangeHistory(id), HttpStatus.OK);
    }

    @PostMapping("/customer/create-customer-findById-schedule")
    public ResponseEntity<?> createCustomerFindByIdSchedule(@RequestBody CreateScheduleGuestRequest request) {
        return new ResponseEntity<>(customerScheduleService.createScheduleGuest(request),HttpStatus.OK);
    }

    @PostMapping("/customer/update-customer-schedule")
    public ResponseEntity<?> createCustomerFindByIdSchedule(@RequestBody UpdateCustomerSchedule request) {
        return new ResponseEntity<>(customerScheduleService.updateCustomerSchedule(request),HttpStatus.OK);
    }

    // Admin / Nhân viên cập nhật trạng thái thanh toán trực tiếp tại quầy
    @PostMapping({"/admin/update-payment-status", "/staff/update-payment-status"})
    public ResponseEntity<?> updatePaymentStatus(@RequestParam Long id) {
        customerScheduleService.updatePaymentStatus(id);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    // Nhân viên phân công bác sĩ / y tá cho lịch tiêm
    @PostMapping("/staff/assign-doctor-nurse")
    public ResponseEntity<?> assignDoctorNurse(@RequestBody AssignDoctorNurseRequest request) {
        customerScheduleService.assignDoctorNurse(request);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    // Admin phân công bác sĩ cho lịch tiêm (sau khi bỏ role Staff)
    @PostMapping("/admin/assign-doctor")
    public ResponseEntity<?> assignDoctorByAdmin(@RequestBody AssignDoctorNurseRequest request) {
        customerScheduleService.assignDoctorNurse(request);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    // Bác sĩ xem danh sách bệnh nhân được phân công
    @PostMapping("/doctor/my-patients")
    public ResponseEntity<?> doctorPatients(@RequestBody ListCustomerScheduleRequest request) {
        return new ResponseEntity<>(customerScheduleService.listCustomerScheduleForDoctor(request), HttpStatus.OK);
    }

    // Y tá xem danh sách bệnh nhân được phân công
    @PostMapping("/nurse/my-patients")
    public ResponseEntity<?> nursePatients(@RequestBody ListCustomerScheduleRequest request) {
        return new ResponseEntity<>(customerScheduleService.listCustomerScheduleForNurse(request), HttpStatus.OK);
    }

    // Khách hàng gửi thông tin tài khoản ngân hàng nhận tiền hoàn
    @PostMapping("/customer/submit-refund-bank/{id}")
    public ResponseEntity<?> submitRefundBankInfo(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String bankName = body.get("bankName");
        String bankAccount = body.get("bankAccount");
        String bankAccountName = body.get("bankAccountName");
        customerScheduleService.submitRefundBankInfo(id, bankName, bankAccount, bankAccountName);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    // Admin xác nhận đã hoàn tiền thủ công cho khách hàng
    @PostMapping("/admin/confirm-refund-done/{id}")
    public ResponseEntity<?> confirmRefundDone(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String refundNotes = body.get("refundNotes");
        customerScheduleService.confirmRefundDone(id, refundNotes);
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
