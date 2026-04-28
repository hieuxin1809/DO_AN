package com.web.service;


import com.web.entity.AgeGroup;
import com.web.repository.AgeGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AgeGroupService {
    @Autowired
    private AgeGroupRepository ageGroupRepository;

    public List<AgeGroup> getAll(){
        return ageGroupRepository.findAll();
    }
}
