package com.web.service;

import com.web.dto.CustomerProfileDTO;
import com.web.dto.DoctorDTO;
import com.web.entity.CustomerProfile;
import com.web.entity.Doctor;
import com.web.exception.MessageException;
import com.web.repository.DoctorRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class DoctorService {

    @Autowired
    private DoctorRepository doctorRepository;

    public List<Doctor> findAll(){
        return doctorRepository.findAll();
    }

    public Page<DoctorDTO> getDoctors(String q, Pageable pageable){
        Page<Doctor> doctors = doctorRepository.getDoctor(q, pageable);
        return doctors.map(this::mapToDTO);
    }

    public void deleteDoctor(Long id){
        Optional<Doctor> doctor = doctorRepository.findById(id);
        if(doctor.isPresent()){
            doctorRepository.delete(doctor.get());
        }else{
            throw new MessageException("Bác sĩ không tìm thấy !");
        }
    }

    public DoctorDTO updateDoctor(Long id, Doctor doctorUpdate){
        Optional<Doctor> doctorExist = doctorRepository.findById(id);

        if (doctorExist.isPresent()) {
            Doctor doctor = doctorExist.get();

            doctor.setAvatar(doctorUpdate.getAvatar());
            doctor.setBio(doctorUpdate.getBio());
            doctor.setFullName(doctorUpdate.getFullName());
            doctor.setSpecialization(doctorUpdate.getSpecialization());
            doctor.setExperienceYears(doctorUpdate.getExperienceYears());

            Doctor result = doctorRepository.save(doctor);
            return mapToDTO(result);
        } else {
            throw new MessageException("Bác sĩ không tồn tại ! ");
        }
    }

    private DoctorDTO mapToDTO(Doctor doctor) {
        DoctorDTO dto = new DoctorDTO();
        BeanUtils.copyProperties(doctor, dto);
        return dto;
    }
}
