package com.web.api;

import com.web.dto.DoctorDTO;
import com.web.dto.NurseDTO;
import com.web.entity.Doctor;
import com.web.entity.Nurse;
import com.web.service.DoctorService;
import com.web.service.NurseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/nurse")
@CrossOrigin
public class NurseApi {

    @Autowired
    private NurseService nurseService;

    @GetMapping("/public/find-all")
    public ResponseEntity<?> findAll(){
        List<Nurse> result = nurseService.findAll();
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    /* -----------ADMIN-----------*/

    /* Get list nurse*/
    @GetMapping("/admin/list-nurse")
    public ResponseEntity<?> findAllNurse(@RequestParam(required = false) String q, Pageable pageable){
        Page<NurseDTO> result = nurseService.getNurse(q, pageable);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    /* update nurse*/
    @PutMapping("/admin/update/{id}")
    public ResponseEntity<?> updateCustomerProfile(@PathVariable("id") Long id, @RequestBody Nurse nurse){
        NurseDTO nurseUpdated = nurseService.updateNurse(id, nurse);
        return new ResponseEntity<>(nurseUpdated, HttpStatus.OK);
    }

    /* Delete a doctor*/
    @DeleteMapping("/admin/delete/{id}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable("id") Long id){
        nurseService.deleteNurse(id);
        return ResponseEntity.ok().build();
    }
    /* -----------ADMIN-----------*/
}
