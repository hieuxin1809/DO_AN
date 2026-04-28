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
        CustomerProfile ex = customerProfileRepository.findByUser(user.getId());
        customerProfile.setId(ex.getId());
        customerProfile.setCreatedDate(ex.getCreatedDate()==null?new Timestamp(System.currentTimeMillis()):ex.getCreatedDate());
        customerProfile.setUser(user);
        customerProfileRepository.save(customerProfile);
        return customerProfile;
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
