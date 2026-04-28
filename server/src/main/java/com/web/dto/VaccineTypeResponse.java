package com.web.dto;

import com.web.entity.Vaccine;
import com.web.entity.VaccineType;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class VaccineTypeResponse {

    private VaccineType vaccineType;

    private List<Vaccine> vaccines = new ArrayList<>();
}
