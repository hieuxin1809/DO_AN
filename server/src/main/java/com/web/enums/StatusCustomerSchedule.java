package com.web.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum StatusCustomerSchedule {

    /** User đã chọn slot nhưng chưa thanh toán xong. Slot bị "hold" tối đa 15 phút,
     *  sau đó cron tự cancel để mở slot cho người khác. */
    pending_payment,
    pending,
    confirmed,
    cancelled,
    finished,
    injected,
    not_injected;
    public static StatusCustomerSchedule getStatusCustomerSchedule( String value ) {
        for (StatusCustomerSchedule status : StatusCustomerSchedule.values()) {
            if (status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        return null;
    }
}
