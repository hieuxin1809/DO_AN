package com.web.api;

import com.web.dto.CustomerProfileDTO;
import com.web.entity.Center;
import com.web.entity.CustomerProfile;
import com.web.repository.CustomerProfileRepository;
import com.web.service.CenterService;
import com.web.service.CustomerProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer-profile")
@CrossOrigin
public class CustomerProfileApi {

    @Autowired
    private CustomerProfileService customerProfileService;

    @GetMapping("/customer/find-by-user")
    public ResponseEntity<?> findByUser(){
        CustomerProfile result = customerProfileService.findByUser();
        System.out.println("customer: "+result.getId());
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @PostMapping("/customer/update-profile")
    public ResponseEntity<?> update(@RequestBody CustomerProfile customerProfile){
        CustomerProfile result = customerProfileService.update(customerProfile);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    /* -----------ADMIN-----------*/

    /* Get list customer*/
    @GetMapping("/admin/list-customer")
    public ResponseEntity<?> findAllCustomerProfile(@RequestParam(required = false) String q, Pageable pageable){
        Page<CustomerProfileDTO> result = customerProfileService.getCustomers(q, pageable);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    /* update customer*/
    @PutMapping("/admin/update/{id}")
    public ResponseEntity<?> updateCustomerProfile(@PathVariable("id") Long id, @RequestBody CustomerProfile customerProfile){
        CustomerProfileDTO customerUpdated = customerProfileService.updateCustomerProfile(id, customerProfile);
        return new ResponseEntity<>(customerUpdated, HttpStatus.OK);
    }

    /* Delete a customer*/
    @DeleteMapping("/admin/delete/{id}")
    public ResponseEntity<Void> deleteCustomer(@PathVariable("id") Long id){
        customerProfileService.deleteCustomer(id);
        return ResponseEntity.ok().build();
    }

    /* -----------ADMIN-----------*/

}
