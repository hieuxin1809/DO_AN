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
import org.springframework.data.jpa.domain.Specification;
import com.web.enums.Gender;
import javax.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalTime;
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

        /* ─── Validate CMND/CCCD (bắt buộc) ─── */
        if (customerProfile.getIdCard() == null || customerProfile.getIdCard().trim().isEmpty()) {
            throw new MessageException("Vui lòng nhập số CMND/CCCD!");
        }
        String idCard = customerProfile.getIdCard().trim();
        if (!idCard.matches("^\\d{9}$|^\\d{12}$")) {
            throw new MessageException("Số CMND (9 chữ số) hoặc CCCD (12 chữ số) không hợp lệ!");
        }
        customerProfile.setIdCard(idCard);

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

    public Page<CustomerProfileDTO> getCustomers(String q, String gender, String city, String fromDate, String toDate, Pageable pageable) {
        Specification<CustomerProfile> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.trim().isEmpty()) {
                String likeTerm = "%" + q.trim().toLowerCase() + "%";
                Predicate fullNameLike = cb.like(cb.lower(root.get("fullName")), likeTerm);
                Predicate phoneLike = cb.like(cb.lower(root.get("phone")), likeTerm);
                Predicate emailLike = cb.like(cb.lower(root.join("user").get("email")), likeTerm);
                predicates.add(cb.or(fullNameLike, phoneLike, emailLike));
            }

            if (gender != null && !gender.trim().isEmpty()) {
                Gender genderEnum = null;
                if ("MALE".equalsIgnoreCase(gender)) genderEnum = Gender.Male;
                else if ("FEMALE".equalsIgnoreCase(gender)) genderEnum = Gender.Female;
                else if ("OTHER".equalsIgnoreCase(gender)) genderEnum = Gender.Other;
                if (genderEnum != null) {
                    predicates.add(cb.equal(root.get("gender"), genderEnum));
                }
            }

            if (city != null && !city.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("city"), city.trim()));
            }

            if (fromDate != null && !fromDate.trim().isEmpty()) {
                try {
                    Timestamp start = Timestamp.valueOf(LocalDate.parse(fromDate.trim()).atStartOfDay());
                    predicates.add(cb.greaterThanOrEqualTo(root.get("createdDate"), start));
                } catch (Exception ignore) {}
            }
            if (toDate != null && !toDate.trim().isEmpty()) {
                try {
                    Timestamp end = Timestamp.valueOf(LocalDate.parse(toDate.trim()).atTime(LocalTime.MAX));
                    predicates.add(cb.lessThanOrEqualTo(root.get("createdDate"), end));
                } catch (Exception ignore) {}
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<CustomerProfile> customers = customerProfileRepository.findAll(spec, pageable);
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
