package com.web.api;

import com.web.dto.VaccineScheduleDoctorDto;
import com.web.entity.Feedback;
import com.web.entity.VaccineScheduleDoctor;
import com.web.entity.VaccineScheduleTime;
import com.web.service.VaccineScheduleDoctorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vaccine-schedule-doctor")
@CrossOrigin
public class VaccineScheduleDoctorApi {

    @Autowired
    private VaccineScheduleDoctorService vaccineScheduleDoctorService;

    @PostMapping("/admin/create")
    public ResponseEntity<?> create(@RequestBody VaccineScheduleDoctorDto dto) {
        vaccineScheduleDoctorService.save(dto.getDoctorId(), dto.getNurseId(), dto.getInjectDate(), dto.getVaccineScheduleId());
        return new ResponseEntity(HttpStatus.CREATED);
    }

    @GetMapping("/all/find-by-schedule")
    public ResponseEntity<?> findByVacxin(@RequestParam Long idSchedule){
        List<VaccineScheduleDoctor> result = vaccineScheduleDoctorService.findBySchedule(idSchedule);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }


    @DeleteMapping("/admin/delete")
    public void delete(@RequestParam("id") Long id){
        vaccineScheduleDoctorService.delete(id);
    }

}
