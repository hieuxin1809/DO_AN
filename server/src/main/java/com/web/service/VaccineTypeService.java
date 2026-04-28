package com.web.service;

import com.web.entity.VaccineType;
import com.web.repository.VaccineTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class VaccineTypeService {

    @Autowired
    private VaccineTypeRepository vaccineTypeRepository;

    public List<VaccineType> findAll(){
        List<VaccineType> list = vaccineTypeRepository.findAll();
        return list;
    }

}
