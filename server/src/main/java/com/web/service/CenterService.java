package com.web.service;

import com.web.entity.Center;
import com.web.repository.CenterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Service quản lý thông tin các trung tâm tiêm chủng.
 */
@Component
public class CenterService {

    @Autowired
    private CenterRepository centerRepository;

    /**
     * Lấy toàn bộ danh sách các trung tâm tiêm chủng.
     */
    public List<Center> findAll(){
        return centerRepository.findAll();
    }

    /**
     * Tìm kiếm một trung tâm tiêm chủng theo ID.
     */
    public Center findById(Long id) {
        return centerRepository.findById(id).orElse(null);
    }

    /**
     * Lưu mới một trung tâm tiêm chủng (tự động điền ngày tạo).
     */
    public Center save(Center center) {
        center.setCreatedDate(new java.sql.Timestamp(System.currentTimeMillis()));
        return centerRepository.save(center);
    }

    /**
     * Cập nhật thông tin trung tâm tiêm chủng hiện tại.
     */
    public Center update(Center center) {
        if (center.getId() == null) {
            throw new IllegalArgumentException("Id không được null");
        }
        Center existing = centerRepository.findById(center.getId())
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy trung tâm"));
        
        center.setCreatedDate(existing.getCreatedDate());
        return centerRepository.save(center);
    }

    /**
     * Xoá trung tâm tiêm chủng theo ID.
     */
    public void delete(Long id) {
        centerRepository.deleteById(id);
    }
}
