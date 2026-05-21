package com.web.service;

import com.web.entity.Manufacturer;
import com.web.exception.MessageException;
import com.web.repository.ManufacturerRepository;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.List;

@Service
public class ManufacturerService {
    @Autowired
    private ManufacturerRepository manufacturerRepository;

    public List<Manufacturer> getAll() {
        return manufacturerRepository.findAll();
    }

    public Manufacturer create(Manufacturer request) {
        if (StringUtils.isBlank(request.getName())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Tên nhà sản xuất không được để trống");
        }
        if (StringUtils.isBlank(request.getCountry())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Quốc gia không được để trống");
        }
        request.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        return manufacturerRepository.save(request);
    }
}
