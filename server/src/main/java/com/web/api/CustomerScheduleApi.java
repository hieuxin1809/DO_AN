package com.web.api;

import com.web.models.UpdateCustomerSchedule;
import com.web.dto.CustomerScheduleVnpay;
import com.web.dto.PaymentRequest;
import com.web.entity.CustomerSchedule;
import com.web.entity.VaccineSchedule;
import com.web.models.ApproveCustomerScheduleRequest;
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
                                        @RequestParam(required = false)Date from,@RequestParam(required = false)Date to ) {
        Page<CustomerSchedule> result = customerScheduleService.mySchedule(pageable, search, from, to);
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

    @PostMapping("/customer/create-customer-findById-schedule")
    public ResponseEntity<?> createCustomerFindByIdSchedule(@RequestBody CreateScheduleGuestRequest request) {
        return new ResponseEntity<>(customerScheduleService.createScheduleGuest(request),HttpStatus.OK);
    }

    @PostMapping("/customer/update-customer-schedule")
    public ResponseEntity<?> createCustomerFindByIdSchedule(@RequestBody UpdateCustomerSchedule request) {
        return new ResponseEntity<>(customerScheduleService.updateCustomerSchedule(request),HttpStatus.OK);
    }
}
