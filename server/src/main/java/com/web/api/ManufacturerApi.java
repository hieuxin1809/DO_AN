package com.web.api;

import com.web.entity.Manufacturer;
import com.web.service.ManufacturerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/manufacturer")
@CrossOrigin
public class ManufacturerApi {

    @Autowired
    private ManufacturerService manufacturerService;

    @PostMapping("/find-all")
    public ResponseEntity<?> getAll() {
        return new ResponseEntity<>(manufacturerService.getAll(), HttpStatus.OK);
    }

    @PostMapping("/create")
    public ResponseEntity<?> create(@RequestBody Manufacturer request) {
        return new ResponseEntity<>(manufacturerService.create(request), HttpStatus.CREATED);
    }
}
