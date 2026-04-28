package com.web.repository;

import com.web.entity.Doctor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    @Query("SELECT d FROM Doctor d " +
            "WHERE (:q IS NULL OR LOWER(d.fullName) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "OR LOWER(d.user.phoneNumber) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "OR LOWER(d.user.email) LIKE LOWER(CONCAT('%', :q, '%')))")
    public Page<Doctor> getDoctor(@Param("q") String q, Pageable pageable);
}
