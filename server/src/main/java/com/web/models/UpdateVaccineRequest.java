package com.web.models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UpdateVaccineRequest extends CreateVaccineRequest{
    private Long id;
    private Integer quantity;
    private Integer inventory;
}
