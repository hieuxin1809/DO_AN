package com.web.api;
import com.nimbusds.openid.connect.sdk.assurance.evidences.Voucher;
import com.web.config.Environment;
import com.web.constants.LogUtils;
import com.web.constants.RequestType;
import com.web.dto.PaymentDto;
import com.web.dto.ResponsePayment;
import com.web.entity.Vaccine;
import com.web.entity.VaccineSchedule;
import com.web.entity.VaccineScheduleTime;
import com.web.exception.MessageException;
import com.web.models.PaymentResponse;
import com.web.models.QueryStatusTransactionResponse;
import com.web.processor.CreateOrderMoMo;
import com.web.processor.QueryTransactionStatus;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.VaccineScheduleRepository;
import com.web.repository.VaccineScheduleTimeRepository;
import com.web.service.VaccineScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/momo")
@CrossOrigin
public class MomoApi {

    @Autowired
    private VaccineScheduleTimeRepository vaccineScheduleTimeRepository;

    @Autowired
    private CustomerScheduleRepository customerScheduleRepository;


    @PostMapping("/create-url-payment")
    public ResponsePayment getUrlPayment(@RequestBody PaymentDto paymentDto){
        LogUtils.init();
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(paymentDto.getIdScheduleTime()).get();
        var count = customerScheduleRepository.countBySchedule(vaccineScheduleTime.getId());
        if(count == null){
            count = 0L;
        }
        if(count + 1 > vaccineScheduleTime.getLimitPeople()){
            throw new MessageException("Lịch tiêm vaccine đã hết lượt đăng ký");
        }
        double finalPrice = vaccineScheduleTime.getVaccineSchedule().getVaccine().getPrice();
        if (paymentDto.getCustomerScheduleId() != null) {
            Optional<com.web.entity.CustomerSchedule> csOpt = customerScheduleRepository.findById(paymentDto.getCustomerScheduleId());
            if (csOpt.isPresent() && csOpt.get().getPrice() != null) {
                finalPrice = csOpt.get().getPrice();
            } else {
                finalPrice = finalPrice * 0.95;
            }
        } else {
            finalPrice = finalPrice * 0.95;
        }

        String orderId = String.valueOf(System.currentTimeMillis());
        String requestId = String.valueOf(System.currentTimeMillis());
        Environment environment = Environment.selectEnv("dev");
        PaymentResponse captureATMMoMoResponse = null;
        try {
            captureATMMoMoResponse = CreateOrderMoMo.process(environment, orderId, requestId, Long.toString(Math.round(finalPrice)), paymentDto.getContent(), paymentDto.getReturnUrl(), paymentDto.getNotifyUrl(), "", RequestType.PAY_WITH_ATM, null);
        } catch (Exception e) {
            e.printStackTrace();
        }
        System.out.println("url ====: "+captureATMMoMoResponse.getPayUrl());
        ResponsePayment responsePayment = new ResponsePayment(captureATMMoMoResponse.getPayUrl(),orderId,requestId);
        return responsePayment;
    }



}
