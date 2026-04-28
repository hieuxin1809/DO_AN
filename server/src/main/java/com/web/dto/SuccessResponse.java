package com.web.dto;

public class SuccessResponse {
    private String message;

    public SuccessResponse() {}

    public SuccessResponse(String message) {
        this.message = message;
    }

    // Getter và Setter
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}