package com.web.api;

import com.web.models.DeleteVaccineInventoryRequest;
import com.web.models.DetailVaccineRequest;
import com.web.models.ListVaccineInventoryRequest;
import com.web.service.VaccineInventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/vaccine-inventory")
@RequiredArgsConstructor
@CrossOrigin
public class VaccineInventoryApi {

    private final VaccineInventoryService vaccineInventoryService;

    @PostMapping("/import")
    public void importVaccineInventory(MultipartFile file) throws IOException {
        vaccineInventoryService.importExcelData(file);
    }

    @PostMapping("/list")
    public ResponseEntity<?> listVaccineInventory(@RequestBody ListVaccineInventoryRequest request) {
        return new ResponseEntity<>(vaccineInventoryService.listVaccineInventory(request), HttpStatus.OK);
    }

    @PostMapping("/delete")
    public boolean deleteVaccineInventory(@RequestBody DeleteVaccineInventoryRequest request) {
        return vaccineInventoryService.deleteVaccine(request);
    }

    @PostMapping("/detail")
    public ResponseEntity<?> getByVaccine(@RequestBody DetailVaccineRequest request) {
        return new ResponseEntity<>(vaccineInventoryService.getByVaccine(request), HttpStatus.OK);
    }
}
