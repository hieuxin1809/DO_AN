package com.web.api;

import com.web.entity.Center;
import com.web.entity.Feedback;
import com.web.entity.VaccineSchedule;
import com.web.service.FeedBackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
@CrossOrigin
public class FeedBackApi {

    @Autowired
    private FeedBackService feedBackService;

    @GetMapping("/customer/my-feedback")
    public ResponseEntity<?> getAll(){
        List<Feedback> result = feedBackService.findByUser();
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @PostMapping("/customer/create")
    public ResponseEntity<?> create(@RequestBody Feedback feedback) {
        Feedback result = feedBackService.create(feedback);
        return new ResponseEntity(result, HttpStatus.CREATED);
    }

    @DeleteMapping("/customer/delete")
    public void delete(@RequestParam("id") Long id){
        feedBackService.delete(id);
    }
}
