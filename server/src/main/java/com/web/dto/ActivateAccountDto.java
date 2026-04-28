package com.web.dto;

public class ActivateAccountDto {
    private String email;
    private String key;

    public ActivateAccountDto() {}

    public ActivateAccountDto(String email, String key) {
        this.email = email;
        this.key = key;
    }

    // Getters và Setters

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }
}