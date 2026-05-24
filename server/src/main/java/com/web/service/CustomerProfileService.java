package com.web.service;

import com.web.dto.CustomerProfileDTO;
import com.web.entity.CustomerProfile;
import com.web.entity.User;
import com.web.exception.MessageException;
import com.web.repository.CustomerProfileRepository;
import com.web.utils.UserUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class CustomerProfileService {

    @Autowired
    private CustomerProfileRepository customerProfileRepository;

    @Autowired
    private UserUtils userUtils;

    public CustomerProfile findByUser(){
        User user = userUtils.getUserWithAuthority();
        CustomerProfile customerProfile = customerProfileRepository.findByUser(user.getId());
        return customerProfile;
    }

    public CustomerProfile update(CustomerProfile customerProfile){
        User user = userUtils.getUserWithAuthority();

        /* ─── Validate dữ liệu nhập ──────────────────────────── */
        if (customerProfile.getFullName() == null || customerProfile.getFullName().trim().isEmpty()) {
            throw new MessageException("Vui lòng nhập họ và tên!");
        }
        if (customerProfile.getPhone() == null || customerProfile.getPhone().trim().isEmpty()) {
            throw new MessageException("Vui lòng nhập số điện thoại!");
        }
        String phone = customerProfile.getPhone().trim();
        if (!phone.matches("^(0|\\+84)\\d{9,10}$")) {
            throw new MessageException("Số điện thoại không hợp lệ! (VD: 0912345678)");
        }
        customerProfile.setPhone(phone);

        if (customerProfile.getBirthdate() == null) {
            throw new MessageException("Vui lòng nhập ngày sinh!");
        }
        long todayMs = System.currentTimeMillis();
        if (customerProfile.getBirthdate().getTime() > todayMs) {
            throw new MessageException("Ngày sinh không thể là tương lai!");
        }

        /* ─── Validate CMND/CCCD (cho phép trống) ─── */
        if (customerProfile.getIdCard() != null) {
            String idCard = customerProfile.getIdCard().trim();
            if (idCard.isEmpty()) {
                customerProfile.setIdCard(null);
            } else if (!idCard.matches("^\\d{9}$|^\\d{12}$")) {
                throw new MessageException("Số CMND (9 chữ số) hoặc CCCD (12 chữ số) không hợp lệ!");
            } else {
                customerProfile.setIdCard(idCard);
            }
        }

        /* ─── Kiểm tra trùng số điện thoại ───────────────────── */
        List<CustomerProfile> dupList = customerProfileRepository.findByPhoneAndOtherUser(phone, user.getId());
        if (dupList != null && !dupList.isEmpty()) {
            throw new MessageException("Số điện thoại '" + phone + "' đã được sử dụng bởi tài khoản khác!");
        }

        CustomerProfile ex = customerProfileRepository.findByUser(user.getId());
        if (ex == null) {
            customerProfile.setCreatedDate(new Timestamp(System.currentTimeMillis()));
            customerProfile.setUser(user);
            customerProfileRepository.save(customerProfile);
            return customerProfile;
        } else {
            customerProfile.setId(ex.getId());
            customerProfile.setCreatedDate(ex.getCreatedDate()==null?new Timestamp(System.currentTimeMillis()):ex.getCreatedDate());
            customerProfile.setUser(user);
            customerProfileRepository.save(customerProfile);
            return customerProfile;
        }
    }

    public Page<CustomerProfileDTO> getCustomers(String q, Pageable pageable){
        Page<CustomerProfile> customers = customerProfileRepository.getCustomerProfile(q, pageable);
        return customers.map(this::mapToDTO);
    }

    public CustomerProfileDTO updateCustomerProfile(Long id, CustomerProfile updatedProfile){
        Optional<CustomerProfile> existingProfileOpt = customerProfileRepository.findById(id);

        if (existingProfileOpt.isPresent()) {
            CustomerProfile existingProfile = existingProfileOpt.get();

            existingProfile.setFullName(updatedProfile.getFullName());
            existingProfile.setGender(updatedProfile.getGender());
            existingProfile.setBirthdate(updatedProfile.getBirthdate());
            existingProfile.setPhone(updatedProfile.getPhone());
            existingProfile.setAvatar(updatedProfile.getAvatar());
            existingProfile.setCity(updatedProfile.getCity());
            existingProfile.setDistrict(updatedProfile.getDistrict());
            existingProfile.setWard(updatedProfile.getWard());
            existingProfile.setStreet(updatedProfile.getStreet());
            existingProfile.setInsuranceStatus(updatedProfile.getInsuranceStatus());
            existingProfile.setContactName(updatedProfile.getContactName());
            existingProfile.setContactRelationship(updatedProfile.getContactRelationship());
            existingProfile.setContactPhone(updatedProfile.getContactPhone());
            CustomerProfile result = customerProfileRepository.save(existingProfile);
            return mapToDTO(result);
        } else {
            throw new MessageException("Khách hàng không tồn tại ! ");
        }
    }

    public void deleteCustomer(Long id){
        Optional<CustomerProfile> customer = customerProfileRepository.findById(id);
        if(customer.isPresent()){
            customerProfileRepository.delete(customer.get());
        }else{
            throw new MessageException("Khách hàng không tìm thấy !");
        }
    }

    private CustomerProfileDTO mapToDTO(CustomerProfile customer) {
        CustomerProfileDTO dto = new CustomerProfileDTO();
        BeanUtils.copyProperties(customer, dto);
        return dto;
    }

}
