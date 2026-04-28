package com.web.repository;

import com.web.entity.Vaccine;
import com.web.entity.VaccineInventory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VaccineInventoryRepository extends JpaRepository<VaccineInventory, Long> {

    Optional<VaccineInventory> findByVaccine(Vaccine vaccine);

    @Query("select vi from VaccineInventory vi  join  Vaccine v on v.id = vi.vaccine.id where v.id = ?1")
    Optional<VaccineInventory> findByVaccineId(long vaccineId);
    Page<VaccineInventory> findAll(Specification<VaccineInventory> spec, Pageable pageable);

}
