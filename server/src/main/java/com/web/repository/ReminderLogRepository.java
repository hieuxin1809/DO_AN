package com.web.repository;

import com.web.entity.ReminderLog;
import com.web.enums.ReminderType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReminderLogRepository extends JpaRepository<ReminderLog, Long> {

    /** Đã gửi reminder loại X cho customer_schedule Y chưa? */
    boolean existsByCustomerScheduleIdAndTypeAndSuccess(Long customerScheduleId, ReminderType type, Boolean success);

    /** Đã gửi reminder NEXT_DOSE cho user + vaccine này chưa (tránh spam) */
    @Query("SELECT COUNT(r) > 0 FROM ReminderLog r WHERE r.userId = :userId " +
           "AND r.type = :type AND r.vaccineName = :vaccineName AND r.success = true")
    boolean existsByUserAndVaccineAndType(@Param("userId") Long userId,
                                          @Param("vaccineName") String vaccineName,
                                          @Param("type") ReminderType type);

    /** Admin xem list */
    @Query("SELECT r FROM ReminderLog r WHERE " +
           "(:keyword IS NULL OR LOWER(r.recipientEmail) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR LOWER(r.recipientName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "  OR LOWER(r.vaccineName) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:type IS NULL OR r.type = :type) AND " +
           "(:success IS NULL OR r.success = :success) " +
           "ORDER BY r.sentAt DESC")
    Page<ReminderLog> searchAdmin(@Param("keyword") String keyword,
                                  @Param("type") ReminderType type,
                                  @Param("success") Boolean success,
                                  Pageable pageable);

    long countBySuccess(Boolean success);

    @Query("SELECT COUNT(r) FROM ReminderLog r WHERE r.type = :type AND r.success = true")
    long countByType(@Param("type") ReminderType type);
}
