package com.web.repository;

import com.web.entity.Center;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CenterRepository extends JpaRepository<Center, Long> {

    Optional<Center> findByCenterName(String id);
    Optional<Center> findByCity (String city);
}
