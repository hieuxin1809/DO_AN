package com.web.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import com.web.entity.WorkSchedule;

public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long> {

    List<WorkSchedule> findByDoctorId(Long doctorId);
}
