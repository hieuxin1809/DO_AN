package com.web.service;

import com.web.entity.*;
import com.web.exception.MessageException;
import com.web.models.CreateVaccineInventoryRequest;
import com.web.models.DeleteVaccineInventoryRequest;
import com.web.models.DetailVaccineRequest;
import com.web.models.ListVaccineInventoryRequest;
import com.web.models.ListVaccineInventoryResponse;
import com.web.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import java.text.SimpleDateFormat;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.persistence.criteria.Predicate;
import java.io.IOException;
import java.io.InputStream;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
/**
 * Service quan ly ton kho va xuat nhap kho vaccine.
 */
public class VaccineInventoryService {
    private final VaccineRepository vaccineRepository;
    private final VaccineInventoryRepository vaccineInventoryRepository;
    private final VaccineTypeRepository vaccineTypeRepository;
    private final AgeGroupRepository ageGroupRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final CenterRepository centerRepository;

    public Page<ListVaccineInventoryResponse> listVaccineInventory(ListVaccineInventoryRequest requestBody) {
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        Pageable pageable = PageRequest.of(
                requestBody.getPage() - 1,
                requestBody.getLimit(),
                Sort.by(Sort.Direction.DESC, "createdDate")
        );

        Page<VaccineInventory> vaccinePage = vaccineInventoryRepository.findAll(
                specificationVaccineInventoryList(requestBody.getCenterId(), requestBody.getVaccineId(), requestBody.getImportDate()), pageable);
        List<ListVaccineInventoryResponse> vaccines = vaccinePage.getContent().stream().map(e
                -> ListVaccineInventoryResponse.builder()
                .id(e.getId())
                .vaccine(e.getVaccine())
                .center(e.getCenter())
                .quantity(e.getQuantity())
                .exportedQuantity(e.getExportedQuantity())
                .createdDate(e.getCreatedDate())
                .expirationDate(e.getExpirationDate())
                .status(e.getStatus())
                .build()
        ).toList();
        return new PageImpl<>(vaccines, pageable, vaccinePage.getTotalElements());
    }

    @Transactional(rollbackFor = Exception.class)
    public VaccineInventory createVaccineInventory(CreateVaccineInventoryRequest requestBody) {
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Dữ liệu không hợp lệ");
        }
        Optional<Vaccine> optionalVaccine = vaccineRepository.findById(requestBody.getVaccineId());
        if (optionalVaccine.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine không tồn tại");
        }
        Optional<Center> optionalCenter = centerRepository.findById(requestBody.getCenterId());
        if (optionalCenter.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Trung tâm không tồn tại");
        }
        Vaccine vaccine = optionalVaccine.get();
        Center center   = optionalCenter.get();

        // Parse expirationDate
        Timestamp expirationDate = null;
        if (!StringUtils.isBlank(requestBody.getExpirationDate())) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
                expirationDate = new Timestamp(sdf.parse(requestBody.getExpirationDate()).getTime());
            } catch (Exception e) {
                throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Ngày hết hạn không hợp lệ (định dạng yyyy-MM-dd)");
            }
        }

        // Nếu đã có lô vaccine ở trung tâm đó thì cộng thêm, không thì tạo mới
        Optional<VaccineInventory> existing = vaccineInventoryRepository.findByVaccineAndCenter(vaccine, center);
        VaccineInventory inventory;
        if (existing.isPresent()) {
            inventory = existing.get();
            inventory.setQuantity(inventory.getQuantity() + requestBody.getQuantity());
            if (expirationDate != null) inventory.setExpirationDate(expirationDate);
        } else {
            inventory = new VaccineInventory();
            inventory.setVaccine(vaccine);
            inventory.setCenter(center);
            inventory.setQuantity(requestBody.getQuantity());
            inventory.setExpirationDate(expirationDate);
            inventory.setImportDate(new Timestamp(System.currentTimeMillis()));
            inventory.setCreatedDate(new Timestamp(System.currentTimeMillis()));
            inventory.setStatus("ACTIVE");
        }
        return vaccineInventoryRepository.save(inventory);
    }

    public VaccineInventory getByVaccine(DetailVaccineRequest requestBody) {
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        Optional<Vaccine> optionalVaccine = vaccineRepository.findById(requestBody.getId());
        if (optionalVaccine.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine không tồn tại");
        }
        Optional<VaccineInventory> optionalVaccineInventory = vaccineInventoryRepository.findByVaccineId(requestBody.getId());
        if (optionalVaccineInventory.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine trong kho không tồn tại");
        }
        return optionalVaccineInventory.get();
    }

    @Transactional(rollbackFor = Exception.class)
    public void importExcelData(MultipartFile file) throws IOException {
        if (ObjectUtils.isEmpty(file)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Chọn file để import");
        }
        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);

            for (Row row : sheet) {

                if (row.getRowNum() == 0) continue; // Skip the header row

                String nameVaccine = getCellValue(row.getCell(1));
                Integer quantity = (int) getCellValueAsDouble(row.getCell(2));
                String nameVaccineType = getCellValue(row.getCell(3));
                String nameAgeGroup = getCellValue(row.getCell(4));
                String nameManufacturer = getCellValue(row.getCell(5));
                String nameCountry = getCellValue(row.getCell(6));
                String trungTam = getCellValue(row.getCell(7));
                Integer price = getCellValueAsDouble(row.getCell(8));
                String image = getCellValue(row.getCell(9));

                if (StringUtils.isBlank(nameVaccine)) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Tên không được bỏ trống tại hàng " + (row.getRowNum() + 1));
                }
                if (ObjectUtils.isEmpty(quantity)) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Số lượng không được bỏ trống tại hàng " + (row.getRowNum() + 1));
                }

                // Fetch or create VaccineType
                Optional<VaccineType> optionalVaccineType = vaccineTypeRepository.findByTypeName(nameVaccineType);
                VaccineType vaccineType;
                if (optionalVaccineType.isEmpty()) {
                    vaccineType = new VaccineType();
                    vaccineType.setTypeName(nameVaccineType);
                    vaccineType.setCreatedDate(new Timestamp(System.currentTimeMillis()));
                    vaccineTypeRepository.save(vaccineType);
                } else {
                    vaccineType = optionalVaccineType.get();
                }

                // tìm kiểm nếu tồn tại thì set , không tồn tại thêm mới
                Optional<AgeGroup> optionalAgeGroup = ageGroupRepository.findByAgeRange(nameAgeGroup);
                AgeGroup ageGroup;
                if (optionalAgeGroup.isEmpty()) {
                    ageGroup = new AgeGroup();
                    ageGroup.setAgeRange(nameAgeGroup);
                    ageGroup.setCreatedDate(new Timestamp(System.currentTimeMillis()));
                    ageGroupRepository.save(ageGroup);
                }else {
                    ageGroup = optionalAgeGroup.get();
                }

                Optional<Manufacturer> optionalManufacturer = manufacturerRepository.findByName(nameManufacturer);
                Manufacturer manufacturer;
                if (optionalManufacturer.isEmpty()) {
                    manufacturer = new Manufacturer();
                    manufacturer.setName(nameManufacturer);
                    manufacturer.setCountry(nameCountry);
                    manufacturer.setCreatedDate(new Timestamp(System.currentTimeMillis()));
                    manufacturerRepository.save(manufacturer);
                }else {
                    manufacturer = optionalManufacturer.get();
                }

                // Fetch or create Vaccine
                Optional<Vaccine> optionalVaccine = vaccineRepository.findByName(nameVaccine);
                Vaccine vaccine;
                if (optionalVaccine.isEmpty()) {
                    vaccine = new Vaccine();
                    vaccine.setInventory(0);
                    vaccine.setVaccineType(vaccineType);
                    vaccine.setAgeGroup(ageGroup);
                    vaccine.setName(nameVaccine);
                    vaccine.setAgeGroup(ageGroup);
                    vaccine.setPrice(price);
                    vaccine.setImage(image);
                    vaccine.setInventory(quantity);
                    vaccine.setStatus("ACTIVE");
                    vaccine.setManufacturer(manufacturer);
                    vaccine.setCreatedDate(new Timestamp(System.currentTimeMillis()));
                    vaccineRepository.save(vaccine);
                } else {
                    vaccine = optionalVaccine.get();
                }

                Optional<Center> optionalCenter = centerRepository.findByCenterName(trungTam);
                if (optionalCenter.isEmpty()) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Trung tâm không tồn tại");
                }
                // Handle Vaccine Inventory
                Optional<VaccineInventory> optionalVaccineInventory = vaccineInventoryRepository.findByVaccine(vaccine);
                VaccineInventory vaccineInventory;
                if (optionalVaccineInventory.isEmpty()) {
                    vaccineInventory = new VaccineInventory();
                    vaccineInventory.setVaccine(vaccine);
                    vaccineInventory.setQuantity(quantity);
                    vaccineInventory.setCenter(optionalCenter.get());
                    vaccineInventory.setImportDate(new Timestamp(System.currentTimeMillis()));
                    vaccineInventory.setCreatedDate(new Timestamp(System.currentTimeMillis()));
                    vaccineInventory.setStatus("ACTIVE");
                    vaccineInventoryRepository.save(vaccineInventory);
                } else {
                    vaccineInventory = optionalVaccineInventory.get();
                    vaccineInventory.setCenter(optionalCenter.get());
                    vaccineInventory.setQuantity(vaccineInventory.getQuantity() + quantity);
                    vaccineInventoryRepository.save(vaccineInventory);
                }
            }
        }
    }


    public boolean deleteVaccine(DeleteVaccineInventoryRequest requestBody) {
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        Optional<VaccineInventory> optionalVaccine = vaccineInventoryRepository.findById(requestBody.getId());
        if (optionalVaccine.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine không tồn tại");
        }
        VaccineInventory vaccineInventory = optionalVaccine.get();

        if (ObjectUtils.equals(vaccineInventory.getStatus(), "DELETE")) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine đã xóa rồi");
        }
        vaccineInventory.setStatus("DELETE");
        try {
            vaccineInventoryRepository.save(vaccineInventory);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Specification<VaccineInventory> specificationVaccineInventoryList(Long centerId, Long vaccineId, String importDate) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.notEqual(root.get("status"), "DELETE"));
            if (centerId != null) {
                predicates.add(criteriaBuilder.equal(root.get("center").get("id"), centerId));
            }
            if (vaccineId != null) {
                predicates.add(criteriaBuilder.equal(root.get("vaccine").get("id"), vaccineId));
            }
            if (importDate != null && !importDate.trim().isEmpty()) {
                try {
                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
                    java.util.Date parsedDate = sdf.parse(importDate);
                    Timestamp startOfDay = new Timestamp(parsedDate.getTime());
                    Timestamp endOfDay = new Timestamp(parsedDate.getTime() + 24 * 60 * 60 * 1000 - 1);
                    predicates.add(criteriaBuilder.between(root.get("createdDate"), startOfDay, endOfDay));
                } catch (Exception e) {
                    // Ignore date format error
                }
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private String getCellValue(Cell cell) {
        if (cell == null) {
            return null;
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
            default -> null;
        };
    }

    private Integer getCellValueAsDouble(Cell cell) {
        if (cell == null) {
            return null;
        }
        switch (cell.getCellType()) {
            case NUMERIC -> {
                return (int) cell.getNumericCellValue();
            }
            case STRING -> {
                try {
                    return Integer.valueOf(cell.getStringCellValue());
                } catch (NumberFormatException e) {
                    return null;
                }
            }
            default -> {
                return null;
            }
        }
    }

}
