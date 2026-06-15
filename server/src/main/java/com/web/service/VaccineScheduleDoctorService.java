package com.web.service;

import com.web.entity.*;
import com.web.exception.MessageException;
import com.web.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

/**
 * Service quản lý phân công Bác sĩ trực ca tiêm chủng.
 */
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

    /**
     * Phân công danh sách bác sĩ và y tá trực cho một ngày và lịch tiêm chủng cụ thể (xoá phân công cũ trước khi gán mới).
     */
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

    /**
     * Tìm danh sách phân công bác sĩ trực theo ID lịch tiêm.
     */
    public List<VaccineScheduleDoctor> findBySchedule(Long scheduleId){
        return vaccineScheduleDoctorRepository.findBySchedule(scheduleId);
    }

    /**
     * Xoá phân công bác sĩ trực theo ID.
     */
    public void delete(Long id) {
        vaccineScheduleDoctorRepository.deleteById(id);
    }
}
