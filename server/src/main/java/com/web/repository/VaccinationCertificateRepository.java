package com.web.repository;

import com.web.entity.VaccinationCertificate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VaccinationCertificateRepository extends JpaRepository<VaccinationCertificate, Long> {

    Optional<VaccinationCertificate> findBySerialNo(String serialNo);

    Optional<VaccinationCertificate> findByCustomerScheduleId(Long customerScheduleId);

    List<VaccinationCertificate> findAllByOrderByIssuedDateDesc();
}
