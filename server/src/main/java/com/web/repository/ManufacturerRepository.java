package com.web.repository;
/*
 *  @author diemdz
 */

import com.web.entity.Manufacturer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface ManufacturerRepository extends JpaRepository<Manufacturer,Long> {

    Optional<Manufacturer> findById(Long id);
    Optional<Manufacturer> findByName(String name);
}
