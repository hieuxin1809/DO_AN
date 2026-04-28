package com.web.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.web.entity.WorkSchedule;
import com.web.service.WorkScheduleService;

@RestController
@RequestMapping("/api/work_schedules")
public class WorkScheduleController {

    @Autowired
    private WorkScheduleService workScheduleService;

    @PostMapping
    public ResponseEntity<WorkSchedule> createSchedule(@RequestBody WorkSchedule workSchedule) {
        System.out.println(workSchedule);
        WorkSchedule createdSchedule = workScheduleService.createSchedule(workSchedule);
        return ResponseEntity.ok(createdSchedule);
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<WorkSchedule>> getSchedulesByDoctorId(@PathVariable Long doctorId) {
        List<WorkSchedule> schedules = workScheduleService.getSchedulesByDoctorId(doctorId);
        return ResponseEntity.ok(schedules);
    }
}
