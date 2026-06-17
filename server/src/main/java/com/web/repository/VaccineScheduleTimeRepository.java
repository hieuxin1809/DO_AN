package com.web.repository;

import com.web.dto.VaccineScheduleTimeResponse;
import com.web.entity.VaccineScheduleTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import java.sql.Date;
import java.util.List;
import java.util.Set;

public interface VaccineScheduleTimeRepository extends JpaRepository<VaccineScheduleTime, Long> {

    @Query("SELECT vt FROM VaccineScheduleTime vt WHERE vt.vaccineSchedule.vaccine.id = :vaccineId " +
           "AND vt.vaccineSchedule.center.id = :centerId " +
           "AND vt.injectDate >= :tomorrow " +
           "ORDER BY vt.injectDate ASC, vt.start ASC")
    List<VaccineScheduleTime> findNextAvailableSlots(
            @Param("vaccineId") Long vaccineId,
            @Param("centerId") Long centerId,
            @Param("tomorrow") Date tomorrow,
            Pageable pageable);

    @Query("select v from VaccineScheduleTime v where v.vaccineSchedule.id = ?1")
    public List<VaccineScheduleTime> findByVaccineSchedule(Long vaccineSchedule);

    @Query("select v.injectDate from VaccineScheduleTime v where v.vaccineSchedule.id = ?1 and v.injectDate >= ?2  order by v.injectDate asc")
    public Set<Date> findDateByVaccineSchedule(Long vaccineSchedule, Date date);

    @Query("select sum(v.limitPeople) from VaccineScheduleTime v where v.vaccineSchedule.id = ?1")
    public Long quantityBySchedule(Long scheduleId);

    @Query(value = "select vt.id, vt.inject_date as injectDate, vt.start, vt.end, vt.limit_people as limitPeople,\n" +
            "(select count(cs.id) from customer_schedule cs where cs.vaccine_schedule_time_id = vt.id and cs.status != 'cancelled') as quantity\n" +
            "from vaccine_schedule_time vt where vt.vaccine_schedule_id = ?1 and vt.inject_date = ?2", nativeQuery = true)
    List<VaccineScheduleTimeResponse> findTimeBySchedule(Long idSchedule, Date date);
    VaccineScheduleTime findFirstByVaccineScheduleId(Long idSchedule);
    List<VaccineScheduleTime> findAllByVaccineScheduleId(Long vaccineScheduleId);

    @Lock(javax.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from VaccineScheduleTime v where v.id = :id")
    java.util.Optional<VaccineScheduleTime> findByIdForUpdate(@Param("id") Long id);
}
