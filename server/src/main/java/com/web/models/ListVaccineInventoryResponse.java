package com.web.models;

import com.web.entity.Vaccine;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.sql.Timestamp;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ListVaccineInventoryResponse {
    private Long id;
    private Vaccine vaccine;
    private Integer quantity;
    private Timestamp createdDate;
    private String status;
}
