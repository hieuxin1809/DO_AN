package com.web.service;

import com.web.entity.Manufacturer;
import com.web.repository.ManufacturerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


import java.util.List;
@Service
public class ManufacturerService {
    @Autowired
    private ManufacturerRepository manufacturerRepository;
    public List<Manufacturer> getAll(){
        return manufacturerRepository.findAll();
    }
}
