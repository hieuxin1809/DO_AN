package com.web.models;

import com.web.entity.Center;
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
    private Center center;
    private Integer quantity;
    private Integer exportedQuantity;
    private Timestamp createdDate;
    private Timestamp expirationDate;
    private String status;
}
