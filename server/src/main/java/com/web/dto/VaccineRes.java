package com.web.dto;

import com.web.entity.Vaccine;
import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;

@Getter
@Setter
public class VaccineRes {

    private Vaccine vaccine;

    private Integer sold;
}
