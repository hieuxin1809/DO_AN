package com.web.service;

import com.web.entity.Doctor;
import com.web.entity.Feedback;
import com.web.entity.User;
import com.web.enums.FeedbackType;
import com.web.exception.MessageException;
import com.web.repository.DoctorRepository;
import com.web.repository.FeedbackRepository;
import com.web.repository.NurseRepository;
import com.web.utils.UserUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.util.List;

/**
 * Service quản lý phản hồi, ý kiến đánh giá của khách hàng.
 */
@Component
public class FeedBackService {

    @Autowired
    private UserUtils userUtils;

    @Autowired
    private FeedbackRepository feedbackRepository;

    /**
     * Lấy danh sách phản hồi của chính khách hàng đang đăng nhập.
     */
    public List<Feedback> findByUser(){
        User user = userUtils.getUserWithAuthority();
        return feedbackRepository.findByUser(user.getId());
    }

    /**
     * Lấy danh sách tất cả các phản hồi trong hệ thống (sắp xếp mới nhất trước).
     */
    public List<Feedback> findAll(){
        return feedbackRepository.findAllByOrderByCreatedDateDesc();
    }

    /**
     * Tạo mới một phản hồi (tự động phân loại: phản hồi chung, phản hồi bác sĩ hoặc y tá).
     */
    public Feedback create(Feedback feedback){
        feedback.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        if(feedback.getDoctor() == null && feedback.getNurse() == null){
            feedback.setFeedbackType(FeedbackType.general);
        }
        if(feedback.getDoctor() != null){
            feedback.setFeedbackType(FeedbackType.doctor);
        }
        if(feedback.getNurse() != null){
            feedback.setFeedbackType(FeedbackType.nurse);
        }
        feedbackRepository.save(feedback);
        return feedback;
    }

    /**
     * Xoá phản hồi theo ID (chỉ cho phép người tạo phản hồi thực hiện xoá).
     */
    public void delete(Long id){
        Feedback feedback = feedbackRepository.findById(id).get();
        if(feedback.getCustomerSchedule().getUser().getId() != userUtils.getUserWithAuthority().getId()){
            throw new MessageException("401 access denied");
        }
        feedbackRepository.deleteById(id);
    }

}