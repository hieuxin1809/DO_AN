package com.web.repository;

import com.web.entity.CustomerSchedule;
import com.web.enums.CustomerSchedulePay;
import com.web.enums.StatusCustomerSchedule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;

public interface CustomerScheduleRepository extends JpaRepository<CustomerSchedule, Long> {

    @Query("select c from CustomerSchedule c where c.user.id = ?1 and c.vaccineScheduleTime.vaccineSchedule.vaccine.name like ?2 and " +
            "c.vaccineScheduleTime.injectDate >= ?3 and c.vaccineScheduleTime.injectDate <= ?4")
    Page<CustomerSchedule> findByUser(Long userId, String search, Date from, Date to, Pageable pageable);

    @Query(value = "select count(cs.id) from customer_schedule cs WHERE cs.vaccine_schedule_id = ?1 and cs.status != 'cancelled'", nativeQuery = true)
    Long countRegis(Long vaccineScheduleId);

    Page<CustomerSchedule> findAll(Specification<CustomerSchedule> spec, Pageable pageable);

    @Query("select count(c.id) from CustomerSchedule c where c.vaccineScheduleTime.id = ?1")
    Long countBySchedule(Long id);

    @Query("SELECT c FROM CustomerSchedule c WHERE c.createdDate > ?1 and c.customerSchedulePay = ?2")
    List<CustomerSchedule> findByCreatedDateAfter(Timestamp createdDate, CustomerSchedulePay customerSchedulePay);

    @Query("select c from CustomerSchedule c where c.vaccineScheduleTime.vaccineSchedule.id = ?1")
    List<CustomerSchedule> findByVaccineSchedule(Long id);

    @Query(value = "select c.* from customer_schedule c inner join vaccine_schedule_time vt on vt.id = c.vaccine_schedule_time_id\n" +
            "where vt.vaccine_schedule_id  = ?1 and vt.inject_date = DATE_SUB(?2, INTERVAL ?3 MONTH)", nativeQuery = true)
    List<CustomerSchedule> findByVaccineScheduleAndDate(Long id, Date date, Integer numMonth);
    /** Entity injectDate là java.sql.Date — bắt buộc param phải khớp type, không dùng LocalDate. */
    @Query("SELECT c FROM CustomerSchedule c WHERE c.vaccineScheduleTime.injectDate = :injectDate")
    List<CustomerSchedule> findByInjectDate(@Param("injectDate") java.sql.Date injectDate);
    long countByVaccineScheduleTimeId(Long vaccineScheduleTimeId);

    @Query("select count(c.id) from CustomerSchedule c where c.vaccineScheduleTime.vaccineSchedule.vaccine.id = ?1")
    Integer countRegisByVaccine(Long vaccineId);

    /**
     * Đếm số mũi đã tiêm thành công của chính user (không tính người thân) cho 1 loại vaccine.
     */
    @Query("SELECT COUNT(c) FROM CustomerSchedule c " +
           "WHERE c.user.id = :userId " +
           "AND c.vaccineScheduleTime.vaccineSchedule.vaccine.id = :vaccineId " +
           "AND c.statusCustomerSchedule IN :statuses " +
           "AND (c.bookingForOther IS NULL OR c.bookingForOther = false)")
    Integer countCompletedDoses(@Param("userId") Long userId,
                                @Param("vaccineId") Long vaccineId,
                                @Param("statuses") List<StatusCustomerSchedule> statuses);

    /**
     * Lấy ngày tiêm của mũi cuối cùng đã tiêm thành công của chính user (không tính người thân).
     */
    @Query("SELECT MAX(c.vaccineScheduleTime.injectDate) FROM CustomerSchedule c " +
           "WHERE c.user.id = :userId " +
           "AND c.vaccineScheduleTime.vaccineSchedule.vaccine.id = :vaccineId " +
           "AND c.statusCustomerSchedule IN :statuses " +
           "AND (c.bookingForOther IS NULL OR c.bookingForOther = false)")
    java.sql.Date findLastInjectedDate(@Param("userId") Long userId,
                                       @Param("vaccineId") Long vaccineId,
                                       @Param("statuses") List<StatusCustomerSchedule> statuses);

    Page<CustomerSchedule> findByDoctor_Id(Long doctorId, Pageable pageable);

    Page<CustomerSchedule> findByNurse_Id(Long nurseId, Pageable pageable);

    @Query("select c from CustomerSchedule c where c.user.id = :userId")
    List<CustomerSchedule> findAllByUserId(@Param("userId") Long userId);

    /** Đếm lịch tiêm có injectDate = ngày cụ thể.
     *  Lưu ý: entity injectDate là java.sql.Date nên truyền java.sql.Date. */
    @Query("SELECT COUNT(c) FROM CustomerSchedule c WHERE c.vaccineScheduleTime.injectDate = :injectDate")
    long countByInjectDate(@Param("injectDate") java.sql.Date injectDate);

    /** Đếm tổng theo từng status — trả về [status, count] */
    @Query("SELECT c.statusCustomerSchedule, COUNT(c) FROM CustomerSchedule c GROUP BY c.statusCustomerSchedule")
    List<Object[]> countByStatusGroup();

    /** Tìm các reservation đang hold quá hạn (status = pending_payment + createdDate < cutoff) */
    @Query("SELECT c FROM CustomerSchedule c WHERE c.statusCustomerSchedule = :status AND c.createdDate < :cutoff")
    List<CustomerSchedule> findExpiredHolds(@Param("status") StatusCustomerSchedule status,
                                            @Param("cutoff") Timestamp cutoff);

    @Query("SELECT c FROM CustomerSchedule c WHERE " +
           "(c.statusCustomerSchedule = :confirmedStatus OR c.statusCustomerSchedule = :pendingStatus) " +
           "AND c.vaccineScheduleTime.injectDate <= :yesterday")
    List<CustomerSchedule> findPotentialMissedAppointments(
            @Param("yesterday") java.sql.Date yesterday,
            @Param("confirmedStatus") StatusCustomerSchedule confirmedStatus,
            @Param("pendingStatus") StatusCustomerSchedule pendingStatus
    );
}
