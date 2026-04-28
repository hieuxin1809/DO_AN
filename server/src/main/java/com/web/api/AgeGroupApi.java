package com.web.api;

import com.web.entity.VaccineType;
import com.web.repository.AgeGroupRepository;
import com.web.service.AgeGroupService;
import com.web.service.VaccineTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/age-group")
@CrossOrigin
public class AgeGroupApi {
    @Autowired
    private AgeGroupService ageGroupService;

    @PostMapping("/find-all")
    public ResponseEntity<?> getAll() {
        return new ResponseEntity<>(ageGroupService.getAll(), HttpStatus.OK);
    }

}
