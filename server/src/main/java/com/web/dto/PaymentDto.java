package com.web.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class PaymentDto {
//    private Long amount;
    private Long idScheduleTime;
    private String content;
    private String returnUrl;
    private String notifyUrl;
}

