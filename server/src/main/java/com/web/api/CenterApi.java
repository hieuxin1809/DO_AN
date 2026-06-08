package com.web.api;

import com.web.entity.Center;
import com.web.service.CenterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/center")
@CrossOrigin
public class CenterApi {

    @Autowired
    private CenterService centerService;

    @GetMapping("/public/find-all")
    public ResponseEntity<?> getAll(){
        List<Center> result = centerService.findAll();
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @PostMapping("/admin/create")
    public ResponseEntity<?> create(@RequestBody Center center){
        Center result = centerService.save(center);
        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }

    @PostMapping("/admin/update")
    public ResponseEntity<?> update(@RequestBody Center center){
        Center result = centerService.update(center);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @DeleteMapping("/admin/delete")
    public ResponseEntity<?> delete(@RequestParam("id") Long id){
        centerService.delete(id);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @GetMapping("/admin/find-by-id")
    public ResponseEntity<?> findById(@RequestParam("id") Long id){
        Center result = centerService.findById(id);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }
}
