package com.web.api;

import com.web.dto.CustomerProfileDTO;
import com.web.dto.DoctorDTO;
import com.web.entity.CustomerProfile;
import com.web.entity.Doctor;
import com.web.service.DoctorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctor")
@CrossOrigin
public class DoctorApi {

    @Autowired
    private DoctorService doctorService;

    @GetMapping("/public/find-all")
    public ResponseEntity<?> findAll(){
        List<Doctor> result = doctorService.findAll();
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    /* -----------ADMIN-----------*/

    /* Get list doctor*/
    @GetMapping("/admin/list-doctor")
    public ResponseEntity<?> findAllDoctor(@RequestParam(required = false) String q, Pageable pageable){
        Page<DoctorDTO> result = doctorService.getDoctors(q, pageable);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    /* update doctor*/
    @PutMapping("/admin/update/{id}")
    public ResponseEntity<?> updateCustomerProfile(@PathVariable("id") Long id, @RequestBody Doctor doctor){
        DoctorDTO doctorUpdated = doctorService.updateDoctor(id, doctor);
        return new ResponseEntity<>(doctorUpdated, HttpStatus.OK);
    }

    /* Delete a doctor*/
    @DeleteMapping("/admin/delete/{id}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable("id") Long id){
        doctorService.deleteDoctor(id);
        return ResponseEntity.ok().build();
    }
    /* -----------ADMIN-----------*/
}
