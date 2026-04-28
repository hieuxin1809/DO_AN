package com.web.service;

import com.web.dto.DoctorDTO;
import com.web.dto.NurseDTO;
import com.web.entity.Doctor;
import com.web.entity.Nurse;
import com.web.exception.MessageException;
import com.web.repository.DoctorRepository;
import com.web.repository.NurseRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class NurseService {

    @Autowired
    private NurseRepository nurseRepository;

    public List<Nurse> findAll(){
        return nurseRepository.findAll();
    }

    public Page<NurseDTO> getNurse(String q, Pageable pageable){
        Page<Nurse> nurses = nurseRepository.getNurse(q, pageable);
        return nurses.map(this::mapToDTO);
    }

    public void deleteNurse(Long id){
        Optional<Nurse> nurse = nurseRepository.findById(id);
        if(nurse.isPresent()){
            nurseRepository.delete(nurse.get());
        }else{
            throw new MessageException("Y tá không tìm thấy !");
        }
    }

    public NurseDTO updateNurse(Long id, Nurse nurseUpdate){
        Optional<Nurse> nurseExist = nurseRepository.findById(id);

        if (nurseExist.isPresent()) {
            Nurse nurse = nurseExist.get();

            nurse.setAvatar(nurseUpdate.getAvatar());
            nurse.setFullName(nurseUpdate.getFullName());
            nurse.setExperienceYears(nurseUpdate.getExperienceYears());
            nurse.setQualification(nurseUpdate.getQualification());
            nurse.setBio(nurseUpdate.getBio());

            Nurse result = nurseRepository.save(nurse);
            return mapToDTO(result);
        } else {
            throw new MessageException("Bác sĩ không tồn tại ! ");
        }
    }

    private NurseDTO mapToDTO(Nurse nurse) {
        NurseDTO dto = new NurseDTO();
        BeanUtils.copyProperties(nurse, dto);
        return dto;
    }
}
