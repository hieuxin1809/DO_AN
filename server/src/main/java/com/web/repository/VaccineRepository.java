package com.web.repository;

import com.web.entity.Vaccine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
@Repository
public interface VaccineRepository extends JpaRepository<Vaccine, Long> {

    @Query("select v from Vaccine v where v.vaccineType.id = ?1")
    public List<Vaccine> findByType(Long typeId);

    Optional<Vaccine> findById(Long id);
    Optional<Vaccine> findByName(String name);

    Page<Vaccine> findAll( Specification<Vaccine> spec,Pageable pageable);

    @Query("select v from Vaccine v where v.name like ?1 ")
    Page<Vaccine> findByParam(String search, Pageable pageable);

    /** Vaccine sắp hết — inventory <= threshold + đang kinh doanh */
    @Query("select v from Vaccine v where v.inventory is not null and v.inventory <= ?1 " +
           "and (v.status is null or v.status = 'ACTIVE') order by v.inventory asc")
    List<Vaccine> findLowStock(Integer threshold);

    /** Vaccine sắp hết hạn — expirationDate trong khoảng [now, deadline] */
    @Query("select v from Vaccine v where v.expirationDate is not null " +
           "and v.expirationDate between ?1 and ?2 order by v.expirationDate asc")
    List<Vaccine> findExpiringSoon(java.sql.Timestamp from, java.sql.Timestamp to);
}
