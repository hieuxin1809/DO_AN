package com.web.service;

import com.web.entity.Center;
import com.web.repository.CenterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CenterService {

    @Autowired
    private CenterRepository centerRepository;

    public List<Center> findAll(){
        return centerRepository.findAll();
    }
}
