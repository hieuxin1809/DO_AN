package com.web.api;

import com.web.dto.PaymentDto;
import com.web.dto.ResponsePayment;
import com.web.entity.VaccineSchedule;
import com.web.entity.VaccineScheduleTime;
import com.web.exception.MessageException;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.VaccineScheduleRepository;
import com.web.repository.VaccineScheduleTimeRepository;
import com.web.vnpay.VNPayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/vnpay")
@CrossOrigin
public class VnpayApi {

    @Autowired
    private VNPayService vnPayService;

    @Autowired
    private VaccineScheduleTimeRepository vaccineScheduleTimeRepository;

    @Autowired
    private CustomerScheduleRepository customerScheduleRepository;


    @PostMapping("/urlpayment")
    public ResponsePayment getUrlPayment(@RequestBody PaymentDto paymentDto){
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(paymentDto.getIdScheduleTime()).get();
        var count = customerScheduleRepository.countBySchedule(vaccineScheduleTime.getId());
        if(count == null){
            count = 0L;
        }
        if(count + 1 > vaccineScheduleTime.getLimitPeople()){
            throw new MessageException("Lịch tiêm vaccine đã hết lượt đăng ký");
        }
        Long td = Long.valueOf(vaccineScheduleTime.getVaccineSchedule().getVaccine().getPrice());

        String orderId = String.valueOf(System.currentTimeMillis());
        String vnpayUrl = vnPayService.createOrder(td.intValue(), orderId, paymentDto.getReturnUrl());
        ResponsePayment responsePayment = new ResponsePayment(vnpayUrl,orderId,null);
        return responsePayment;
    }
}
