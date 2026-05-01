package com.web.service;

import com.web.entity.Center;
import com.web.repository.CenterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CenterService {

    @Autowired
    private CenterRepository centerRepository;

    public List<Center> findAll(){
        return centerRepository.findAll();
    }

    public Center findById(Long id) {
        return centerRepository.findById(id).orElse(null);
    }

    public Center save(Center center) {
        center.setCreatedDate(new java.sql.Timestamp(System.currentTimeMillis()));
        return centerRepository.save(center);
    }

    public Center update(Center center) {
        if (center.getId() == null) {
            throw new IllegalArgumentException("Id không được null");
        }
        Center existing = centerRepository.findById(center.getId())
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy trung tâm"));
        
        center.setCreatedDate(existing.getCreatedDate());
        return centerRepository.save(center);
    }

    public void delete(Long id) {
        centerRepository.deleteById(id);
    }
}
