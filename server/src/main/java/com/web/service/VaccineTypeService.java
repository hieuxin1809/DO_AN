package com.web.service;

import com.web.entity.VaccineType;
import com.web.repository.VaccineTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Service quản lý danh mục loại vaccine (vd: vaccine sống giảm độc lực, mRNA,...).
 */
@Component
public class VaccineTypeService {

    @Autowired
    private VaccineTypeRepository vaccineTypeRepository;

    /**
     * Lấy danh sách tất cả các loại vaccine trong hệ thống.
     */
    public List<VaccineType> findAll(){
        List<VaccineType> list = vaccineTypeRepository.findAll();
        return list;
    }

}
