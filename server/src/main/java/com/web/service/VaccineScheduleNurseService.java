package com.web.service;

import com.web.entity.VaccineScheduleDoctor;
import com.web.entity.VaccineScheduleNurse;
import com.web.repository.VaccineScheduleNurseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VaccineScheduleNurseService {

    @Autowired
    private VaccineScheduleNurseRepository vaccineScheduleNUrseRepository;

    public List<VaccineScheduleNurse> findBySchedule(Long scheduleId){
        return vaccineScheduleNUrseRepository.findBySchedule(scheduleId);
    }

    public void delete(Long id) {
        vaccineScheduleNUrseRepository.deleteById(id);
    }
}
