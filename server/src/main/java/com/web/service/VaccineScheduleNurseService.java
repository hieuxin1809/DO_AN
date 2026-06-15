package com.web.service;

import com.web.entity.VaccineScheduleDoctor;
import com.web.entity.VaccineScheduleNurse;
import com.web.repository.VaccineScheduleNurseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service quản lý phân công Y tá trực ca tiêm chủng.
 */
@Service
public class VaccineScheduleNurseService {

    @Autowired
    private VaccineScheduleNurseRepository vaccineScheduleNUrseRepository;

    /**
     * Lấy danh sách các Y tá được phân công trực theo ID lịch tiêm.
     */
    public List<VaccineScheduleNurse> findBySchedule(Long scheduleId){
        return vaccineScheduleNUrseRepository.findBySchedule(scheduleId);
    }

    /**
     * Xoá phân công Y tá trực theo ID.
     */
    public void delete(Long id) {
        vaccineScheduleNUrseRepository.deleteById(id);
    }
}
