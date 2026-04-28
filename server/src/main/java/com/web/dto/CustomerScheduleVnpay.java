package com.web.dto;

import com.web.entity.CustomerSchedule;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerScheduleVnpay {

    private CustomerSchedule customerSchedule;

    private String vnpOrderInfo;

    private String vnpayUrl;
}
