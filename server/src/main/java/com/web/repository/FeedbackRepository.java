package com.web.repository;

import com.web.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @Query("select f from Feedback f where f.customerSchedule.user.id = ?1")
    List<Feedback> findByUser(Long userId);
}
