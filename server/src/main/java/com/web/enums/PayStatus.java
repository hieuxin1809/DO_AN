    package com.web.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum PayStatus {
    CHUA_THANH_TOAN,
    DA_THANH_TOAN,
    REFUND_PENDING, // Chờ khách nhập thông tin ngân hàng
    REFUNDED        // Đã hoàn tiền thành công
}
