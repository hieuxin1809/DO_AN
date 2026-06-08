package com.web.repository;

import com.web.entity.ScheduleChangeHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleChangeHistoryRepository extends JpaRepository<ScheduleChangeHistory, Long> {

    /** Lịch sử đổi của 1 customer schedule, mới nhất trước. */
    List<ScheduleChangeHistory> findByCustomerScheduleIdOrderByChangedAtDesc(Long customerScheduleId);

    long countByCustomerScheduleId(Long customerScheduleId);
}
