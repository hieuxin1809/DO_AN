package com.web.repository;

import com.web.entity.VaccinationCertificate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

public interface VaccinationCertificateRepository extends JpaRepository<VaccinationCertificate, Long> {

    Optional<VaccinationCertificate> findBySerialNo(String serialNo);

    Optional<VaccinationCertificate> findByCustomerScheduleId(Long customerScheduleId);

    List<VaccinationCertificate> findAllByOrderByIssuedDateDesc();

    /* ─── Admin search với filter ─── */
    @Query("SELECT c FROM VaccinationCertificate c WHERE " +
            "(:keyword IS NULL OR " +
            "  LOWER(c.serialNo) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "  LOWER(c.fullNameSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "  LOWER(c.idCardSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "  LOWER(c.phoneSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
            "(:vaccineName IS NULL OR LOWER(c.vaccineName) LIKE LOWER(CONCAT('%', :vaccineName, '%'))) AND " +
            "(:centerName IS NULL OR LOWER(c.centerName) LIKE LOWER(CONCAT('%', :centerName, '%'))) AND " +
            "(:revoked IS NULL OR c.revoked = :revoked) AND " +
            "(:fromDate IS NULL OR c.issuedDate >= :fromDate) AND " +
            "(:toDate IS NULL OR c.issuedDate <= :toDate) " +
            "ORDER BY c.issuedDate DESC")
    Page<VaccinationCertificate> searchAdmin(
            @Param("keyword") String keyword,
            @Param("vaccineName") String vaccineName,
            @Param("centerName") String centerName,
            @Param("revoked") Boolean revoked,
            @Param("fromDate") Timestamp fromDate,
            @Param("toDate") Timestamp toDate,
            Pageable pageable
    );

    /* ─── Stats: đếm theo trạng thái ─── */
    @Query("SELECT COUNT(c) FROM VaccinationCertificate c WHERE c.revoked = false")
    long countActive();

    @Query("SELECT COUNT(c) FROM VaccinationCertificate c WHERE c.revoked = true")
    long countRevoked();
}
