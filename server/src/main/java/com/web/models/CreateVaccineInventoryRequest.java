package com.web.models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CreateVaccineInventoryRequest {
    private Long vaccineId;
    private Long centerId;
    private Integer quantity;
    private String expirationDate; // format: yyyy-MM-dd
}
