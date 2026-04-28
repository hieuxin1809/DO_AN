package com.web.api;

import com.web.entity.VaccineScheduleDoctor;
import com.web.entity.VaccineScheduleNurse;
import com.web.service.VaccineScheduleNurseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vaccine-schedule-nurse")
@CrossOrigin
public class VaccineScheduleNurseApi {

    @Autowired
    private VaccineScheduleNurseService vaccineScheduleNurseService;

    @GetMapping("/all/find-by-schedule")
    public ResponseEntity<?> findByVacxin(@RequestParam Long idSchedule){
        List<VaccineScheduleNurse> result = vaccineScheduleNurseService.findBySchedule(idSchedule);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @DeleteMapping("/admin/delete")
    public void delete(@RequestParam("id") Long id){
        vaccineScheduleNurseService.delete(id);
    }
}
