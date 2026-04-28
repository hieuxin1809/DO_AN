package com.web.api;

import com.web.repository.AgeGroupRepository;
import com.web.repository.ManufacturerRepository;
import com.web.service.ManufacturerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/manufacturer")
@CrossOrigin
public class ManufacturerApi {
    @Autowired
    private ManufacturerService manufacturerService;
    @PostMapping("/find-all")
    public ResponseEntity<?> getAll(){
        return new ResponseEntity<>(manufacturerService.getAll(), HttpStatus.OK);
    }
}
