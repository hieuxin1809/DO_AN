package com.web.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service; // Thêm import cho @Service

import com.web.entity.WorkSchedule; // Đảm bảo rằng bạn import đúng entity
import com.web.repository.WorkScheduleRepository;

@Service // Thêm chú thích @Service
public class WorkScheduleService {

    @Autowired
    private WorkScheduleRepository workScheduleRepository;

    public WorkSchedule createSchedule(WorkSchedule workSchedule) {
        return workScheduleRepository.save(workSchedule);
    }

    public List<WorkSchedule> getSchedulesByDoctorId(Long doctorId) {
        return workScheduleRepository.findByDoctorId(doctorId);
    }
}
