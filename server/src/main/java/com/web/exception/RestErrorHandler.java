package com.web.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

@ControllerAdvice
public class RestErrorHandler {

    @ExceptionHandler(MessageException.class)
    @ResponseStatus(HttpStatus.EXPECTATION_FAILED)
    @ResponseBody
    public Object processValidationError(MessageException ex) {
        String result = ex.getDefaultMessage();
        System.out.println("###########"+result);
        return ex;
    }

    /**
     * Fallback cho mọi lỗi unique/constraint của DB (Duplicate entry, FK, ...)
     * Trả về MessageException với message thân thiện thay vì stack trace.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.EXPECTATION_FAILED)
    @ResponseBody
    public Object processDataIntegrity(DataIntegrityViolationException ex) {
        String raw = ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : ex.getMessage();
        String friendly = humanize(raw);
        System.out.println("########### DataIntegrity: " + raw);
        return new MessageException(friendly);
    }

    private String humanize(String raw) {
        if (raw == null) return "Dữ liệu không hợp lệ!";
        String lower = raw.toLowerCase();
        // MySQL: "Duplicate entry 'XXX' for key 'table.column'"
        if (lower.contains("duplicate entry")) {
            if (lower.contains("phone"))    return "Số điện thoại đã được sử dụng bởi tài khoản khác!";
            if (lower.contains("email"))    return "Email đã được sử dụng bởi tài khoản khác!";
            if (lower.contains("username")) return "Tên đăng nhập đã tồn tại!";
            // Lấy ra giá trị bị trùng
            int s = raw.indexOf('\''); int e = raw.indexOf('\'', s + 1);
            String val = (s >= 0 && e > s) ? raw.substring(s + 1, e) : "";
            return "Giá trị '" + val + "' đã tồn tại trong hệ thống!";
        }
        if (lower.contains("foreign key")) return "Không thể thực hiện vì dữ liệu đang được tham chiếu!";
        if (lower.contains("cannot be null") || lower.contains("not-null")) return "Vui lòng nhập đầy đủ thông tin bắt buộc!";
        return "Lỗi dữ liệu: " + raw;
    }
}
