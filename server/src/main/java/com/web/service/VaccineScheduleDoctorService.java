package com.web.service;

import com.web.entity.*;
import com.web.exception.MessageException;
import com.web.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

@Service
public class VaccineScheduleDoctorService {

    @Autowired
    private VaccineScheduleDoctorRepository vaccineScheduleDoctorRepository;

    @Autowired
    private VaccineScheduleNurseRepository vaccineScheduleNUrseRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private NurseRepository nurseRepository;

    @Autowired
    private VaccineScheduleRepository vaccineScheduleRepository;

    public void save(List<Long> doctorId, List<Long> nurseId, Date injectDate, Long vaccineScheduleId){
        try {
            vaccineScheduleDoctorRepository.deleteByVaccineSchedule(vaccineScheduleId, injectDate);
            vaccineScheduleNUrseRepository.deleteByVaccineSchedule(vaccineScheduleId, injectDate);
        }
        catch (Exception e){
            throw new MessageException("Không thể thay đổi bác sĩ hoặc y tá");
        }
        VaccineSchedule vaccineSchedule = vaccineScheduleRepository.findById(vaccineScheduleId).get();
        for(Long id : doctorId){
            Doctor doctor = doctorRepository.findById(id).get();
            VaccineScheduleDoctor vaccineScheduleDoctor = new VaccineScheduleDoctor();
            vaccineScheduleDoctor.setDoctor(doctor);
            vaccineScheduleDoctor.setVaccineSchedule(vaccineSchedule);
            vaccineScheduleDoctor.setInjectDate(injectDate);
            vaccineScheduleDoctorRepository.save(vaccineScheduleDoctor);
        }
        for(Long id : nurseId){
            Nurse nurse = nurseRepository.findById(id).get();
            VaccineScheduleNurse vaccineScheduleNurse = new VaccineScheduleNurse();
            vaccineScheduleNurse.setNurse(nurse);
            vaccineScheduleNurse.setVaccineSchedule(vaccineSchedule);
            vaccineScheduleNurse.setInjectDate(injectDate);
            vaccineScheduleNUrseRepository.save(vaccineScheduleNurse);
        }
    }

    public List<VaccineScheduleDoctor> findBySchedule(Long scheduleId){
        return vaccineScheduleDoctorRepository.findBySchedule(scheduleId);
    }

    public void delete(Long id) {
        vaccineScheduleDoctorRepository.deleteById(id);
    }
}
