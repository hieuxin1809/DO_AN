package com.web.service;

import com.web.dto.VaccineTypeResponse;
import com.web.entity.*;
import com.web.exception.MessageException;
import com.web.models.CreateVaccineRequest;
import com.web.models.CreateVaccineResponse;
import com.web.models.DeleteVaccineRequest;
import com.web.models.DetailVaccineRequest;
import com.web.models.DetailVaccineResponse;
import com.web.models.ListVaccineRequest;
import com.web.models.ListVaccineResponse;
import com.web.models.PlusVaccineRequest;
import com.web.models.PlusVaccineResponse;
import com.web.models.UpdateVaccineRequest;
import com.web.models.UpdateVaccineResponse;
import com.web.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.persistence.criteria.Predicate;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
/**
 * Service quản lý danh mục và thông tin chi tiết của các loại Vaccine.
 * 
 * Các chức năng chính bao gồm:
 * - Truy vấn danh sách Vaccine theo phân trang và lọc động (Specification).
 * - Tạo mới, cập nhật thông tin Vaccine (đồng bộ giá cả lịch tiêm liên quan).
 * - Xóa mềm Vaccine (cập nhật trạng thái sang "DELETE").
 * - Xuất kho vaccine từ trung tâm cụ thể (trừ tồn kho vật lý, cộng dồn số lượng xuất).
 * - Nhập dữ liệu hàng loạt từ file Excel.
 */
public class VaccineService {

    private final ModelMapper modelMapper;
    private final VaccineRepository vaccineRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final AgeGroupRepository ageGroupRepository;
    private final VaccineTypeRepository vaccineTypeRepository;
    private final VaccineInventoryRepository vaccineInventoryRepository;
    private final CenterRepository centerRepository;
    private final VaccineScheduleRepository vaccineScheduleRepository;

    /**
     * Lấy toàn bộ danh sách vaccine có trong cơ sở dữ liệu.
     * Dùng cho các dropdown hoặc các chức năng không cần phân trang.
     */
    public List<Vaccine> findAll() {
        return vaccineRepository.findAll();
    }

    /**
     * Tìm danh sách các vaccine thuộc một loại vaccine cụ thể (typeId).
     */
    public List<Vaccine> findByType(Long typeId) {
        return vaccineRepository.findByType(typeId);
    }

    /**
     * Lấy danh sách phân loại vaccine cùng danh sách vaccine chi tiết thuộc phân loại đó.
     * Dùng để hiển thị menu hoặc nhóm danh mục vaccine trên giao diện.
     */
    public List<VaccineTypeResponse> allVaccinType() {
        List<VaccineTypeResponse> list = new ArrayList<>();
        // Bước 1: Lấy tất cả các loại vaccine hiện có trong hệ thống
        List<VaccineType> vaccineTypes = vaccineTypeRepository.findAll();
        
        // Bước 2: Duyệt qua từng loại vaccine để lấy danh sách vaccine chi tiết tương ứng
        for (VaccineType v : vaccineTypes) {
            VaccineTypeResponse n = new VaccineTypeResponse();
            // Lấy danh sách vaccine thuộc loại hiện tại
            List<Vaccine> vc = vaccineRepository.findByType(v.getId());
            n.setVaccines(vc);
            n.setVaccineType(v);
            list.add(n);
        }
        return list;
    }

    /**
     * Tìm kiếm và phân trang danh sách vaccine dựa trên các tiêu chí lọc động.
     * 
     * @param requestBody Chứa thông tin phân trang (page, limit) và bộ lọc (tên, giá, nhà sản xuất, ngày tạo).
     * @return Trang kết quả chứa danh sách DTO ListVaccineResponse.
     */
    public Page<ListVaccineResponse> listVaccine(ListVaccineRequest requestBody) {
        // Bước 1: Kiểm tra requestBody không được rỗng
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        
        // Bước 2: Thiết lập đối tượng phân trang (page index trong Spring Data JPA bắt đầu từ 0)
        // Sắp xếp mặc định: Vaccine mới tạo sẽ hiển thị lên đầu (giảm dần theo createdDate)
        Pageable pageable = PageRequest.of(
                requestBody.getPage() - 1,
                requestBody.getLimit(),
                Sort.by(Sort.Direction.DESC, "createdDate")
        );

        // Bước 3: Truy vấn danh sách thực thể Vaccine từ database kết hợp Specification lọc động và phân trang
        Page<Vaccine> vaccinePage = vaccineRepository.findAll(specificationVaccineList(requestBody), pageable);
        
        // Bước 4: Ánh xạ danh sách thực thể Vaccine sang danh sách DTO response
        List<ListVaccineResponse> vaccines = vaccinePage.getContent().stream().map(e
                -> ListVaccineResponse.builder()
                .id(e.getId())
                .nameVaccine(e.getName())
                .price(e.getPrice())
                .description(e.getDescription())
                .status(e.getStatus())
                .image(e.getImage())
                .inventory(e.getInventory())
                .createdDate(e.getCreatedDate())
                .vaccineType(e.getVaccineType())
                .manufacturer(e.getManufacturer())
                .expirationDate(e.getExpirationDate())
                .ageGroup(e.getAgeGroup())
                .build()
        ).toList();
        
        // Bước 5: Trả về đối tượng PageImpl phục vụ phân trang ở phía Client
        return new PageImpl<>(vaccines, pageable, vaccinePage.getTotalElements());
    }

    /**
     * Tạo mới thông tin một loại Vaccine vào danh mục hệ thống.
     * 
     * @param requestBody Dữ liệu yêu cầu thêm mới Vaccine.
     * @return DTO chứa thông tin Vaccine đã tạo thành công.
     */
    public CreateVaccineResponse createVaccine(CreateVaccineRequest requestBody) {
        // Bước 1: Kiểm tra tính hợp lệ và sự đầy đủ của các trường bắt buộc
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        if (StringUtils.isEmpty(requestBody.getName())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Nhập tên vaccine");
        }
        if (ObjectUtils.isEmpty(requestBody.getInventory())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Nhập số lượng vaccine");
        }
        if (ObjectUtils.isEmpty(requestBody.getPrice())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Nhập giá vaccine");
        }
        if (ObjectUtils.isEmpty(requestBody.getVaccineTypeId())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Chọn loại vaccine");
        }
        if (ObjectUtils.isEmpty(requestBody.getManufacturerId())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Chọn nhà sản xuất");
        }
        if (ObjectUtils.isEmpty(requestBody.getAgeGroupId())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Chọn nhóm tuổi");
        }
        
        // Bước 2: Kiểm tra sự tồn tại thực tế của các thực thể liên quan (Loại vaccine, Nhà sản xuất, Nhóm tuổi)
        Optional<VaccineType> optionalVaccineType = vaccineTypeRepository.findById(requestBody.getVaccineTypeId());
        if (optionalVaccineType.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Loại vaccine không tồn tại");
        }
        Optional<Manufacturer> optionalManufacturer = manufacturerRepository.findById(requestBody.getManufacturerId());
        if (optionalManufacturer.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Nhà sản xuất không tồn tại");
        }
        Optional<AgeGroup> optionalAgeGroup = ageGroupRepository.findById(requestBody.getAgeGroupId());
        if (optionalAgeGroup.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Nhóm tuổi không tồn tại");
        }
        
        // Bước 3: Tạo mới thực thể Vaccine và gán các giá trị từ Request gửi lên
        Vaccine vaccine = new Vaccine();
        vaccine.setName(requestBody.getName());
        vaccine.setPrice(requestBody.getPrice());
        vaccine.setImage(requestBody.getImage());
        
        // Chú ý: Tồn kho mặc định ban đầu là 0. Số lượng vaccine thực tế sẽ do quá trình nhập kho quản lý
        vaccine.setInventory(0); 
        vaccine.setDescription(requestBody.getDescription());
        vaccine.setStatus(requestBody.getStatus());
        vaccine.setVaccineType(optionalVaccineType.get());
        vaccine.setManufacturer(optionalManufacturer.get());
        vaccine.setAgeGroup(optionalAgeGroup.get());
        
        // Các thông số cá nhân hóa: Số mũi tiêm tối đa và Khoảng cách tối thiểu giữa các mũi (đơn vị: tháng)
        vaccine.setMaxDose(requestBody.getMaxDose());
        vaccine.setMinIntervalMonths(requestBody.getMinIntervalMonths());
        vaccine.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        
        // Bước 4: Lưu thông tin Vaccine mới vào cơ sở dữ liệu
        vaccineRepository.save(vaccine);

        // Bước 5: Ánh xạ thực thể vừa lưu sang DTO phản hồi
        return modelMapper.map(vaccine, CreateVaccineResponse.class);
    }

    /**
     * Cập nhật thông tin chi tiết của Vaccine và đồng bộ giá bán với các lịch tiêm hiện có.
     * 
     * @param requestBody Dữ liệu yêu cầu cập nhật thông tin Vaccine.
     * @return DTO chứa thông tin Vaccine sau khi cập nhật.
     */
    public UpdateVaccineResponse updateVaccine(UpdateVaccineRequest requestBody) {
        // Bước 1: Kiểm tra tính hợp lệ của dữ liệu đầu vào
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Thông tin cập nhật không được để trống");
        }
        if (StringUtils.isEmpty(requestBody.getName())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Tên vaccine không được để trống");
        }
        if (ObjectUtils.isEmpty(requestBody.getPrice())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Giá vaccine không được để trống");
        }
        if (ObjectUtils.isEmpty(requestBody.getInventory())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Số lượng vaccine không được để trống");
        }
        if (requestBody.getInventory() < 0) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Số lượng vaccine phải là số dương");
        }

        // Bước 2: Tìm kiếm Vaccine cần cập nhật trong database. Nếu không tìm thấy sẽ báo lỗi.
        Optional<Vaccine> optionalVaccine = vaccineRepository.findById(requestBody.getId());
        if (optionalVaccine.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine không tồn tại");
        }

        // Bước 3: Cập nhật thông tin cơ bản cho thực thể Vaccine
        Vaccine vaccine = optionalVaccine.get();
        vaccine.setName(requestBody.getName());
        vaccine.setPrice(requestBody.getPrice());
        vaccine.setImage(requestBody.getImage());
        vaccine.setDescription(requestBody.getDescription());
        vaccine.setStatus(requestBody.getStatus());
        vaccine.setMaxDose(requestBody.getMaxDose());
        vaccine.setMinIntervalMonths(requestBody.getMinIntervalMonths());
        vaccineRepository.save(vaccine);

        // Bước 4: ĐỒNG BỘ giá bán. Tìm tất cả lịch tiêm liên quan đến vaccine này và cập nhật lại giá theo giá mới sửa.
        List<VaccineSchedule> schedules = vaccineScheduleRepository.findByVaccineId(vaccine.getId());
        for (VaccineSchedule schedule : schedules) {
            schedule.setPrice(BigDecimal.valueOf(requestBody.getPrice()));
            vaccineScheduleRepository.save(schedule);
        }

        // Bước 5: Ánh xạ và trả về kết quả cập nhật
        return modelMapper.map(vaccine, UpdateVaccineResponse.class);
    }

    /**
     * Xóa Vaccine (Hệ thống thực hiện xóa mềm - đổi trạng thái và cố gắng xóa vật lý nếu chưa được dùng).
     */
    public boolean deleteVaccine(DeleteVaccineRequest requestBody) {
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        // Bước 1: Tìm kiếm Vaccine trong database
        Optional<Vaccine> optionalVaccine = vaccineRepository.findById(requestBody.getId());
        if (optionalVaccine.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine không tồn tại");
        }
        
        Vaccine vaccine = optionalVaccine.get();
        // Bước 2: Nếu đã được đánh dấu xóa trước đó thì báo lỗi tránh lặp lại hành động
        if (ObjectUtils.equals(vaccine.getStatus(), "DELETE")) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine đã xóa rồi");
        }
        
        // Bước 3: Đổi trạng thái sang "DELETE" để ẩn khỏi giao diện bán hàng/lập lịch
        vaccine.setStatus("DELETE");
        try {
            // Cố gắng xóa vật lý trong database.
            vaccineRepository.deleteById(requestBody.getId());
            return true;
        } catch (Exception e) {
            // Nếu phát sinh lỗi (thường do có ràng buộc khóa ngoại từ bảng lịch đặt hoặc lịch tiêm),
            // ta ném ngoại lệ thông báo vaccine đã được sử dụng nên không thể xóa vật lý khỏi database.
            throw new MessageException(500, "Vaccine đã được sử dụng, không thể xóa");
        }
    }

    /**
     * Nghiệp vụ Xuất Kho: Xuất một số lượng vaccine từ kho của trung tâm tiêm chủng.
     * Giúp trừ tồn kho vật lý tại trung tâm và ghi nhận số lượng đã xuất kho.
     * 
     * @param requestBody Chứa tên vaccine, ID trung tâm, và số lượng cần xuất.
     */
    public PlusVaccineResponse plusVaccine(PlusVaccineRequest requestBody) {
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        // Bước 1: Tìm kiếm vaccine theo tên
        Optional<Vaccine> optionalVaccine = vaccineRepository.findByName(requestBody.getName());
        if (optionalVaccine.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine không tồn tại");
        }
        Vaccine vaccine = optionalVaccine.get();

        // Bước 2: Kiểm tra trạng thái kinh doanh của vaccine
        if (ObjectUtils.equals(vaccine.getStatus(), "INACTIVE")) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Chỉ được thêm số lượng cho vaccine còn kinh doanh");
        }

        // Bước 3: Xác định trung tâm tiêm chủng thực hiện xuất kho
        if (ObjectUtils.isEmpty(requestBody.getCenterId())) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vui lòng chọn trung tâm để xuất kho");
        }
        Optional<Center> optionalCenter = centerRepository.findById(requestBody.getCenterId());
        if (optionalCenter.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Trung tâm không tồn tại");
        }
        
        // Bước 4: Lấy thông tin tồn kho (VaccineInventory) của vaccine này tại trung tâm đã chọn
        Optional<VaccineInventory> optionalVaccineInventory = vaccineInventoryRepository.findByVaccineAndCenter(vaccine, optionalCenter.get());
        if (optionalVaccineInventory.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Không tìm thấy lô vaccine này tại trung tâm đã chọn");
        }
        
        VaccineInventory vaccineInventory = optionalVaccineInventory.get();
        // Bước 5: Kiểm tra số lượng tồn trong kho có đủ để xuất hay không
        if (vaccineInventory.getQuantity() == null || vaccineInventory.getQuantity() == 0) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Số lượng vaccine trong kho của trung tâm này đã hết");
        }
        if (requestBody.getQuantity() > vaccineInventory.getQuantity()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Số lượng xuất vượt quá tồn kho của trung tâm (còn " + vaccineInventory.getQuantity() + ")");
        }

        // Bước 6: Trừ số lượng tồn kho vật lý tại trung tâm đó
        vaccineInventory.setQuantity(vaccineInventory.getQuantity() - requestBody.getQuantity());
        
        // Bước 7: Cộng dồn số lượng đã xuất kho (exportedQuantity)
        int prevExported = vaccineInventory.getExportedQuantity() != null ? vaccineInventory.getExportedQuantity() : 0;
        vaccineInventory.setExportedQuantity(prevExported + requestBody.getQuantity());
        
        // Bước 8: Lưu thông tin tồn kho đã cập nhật vào cơ sở dữ liệu
        vaccineInventoryRepository.save(vaccineInventory);

        // Bước 9: Trả về thông tin chi tiết của Vaccine
        return PlusVaccineResponse.builder()
                .id(vaccine.getId())
                .vaccineType(vaccine.getVaccineType())
                .image(vaccine.getImage())
                .inventory(vaccine.getInventory())
                .name(vaccine.getName())
                .price(vaccine.getPrice())
                .status(vaccine.getStatus())
                .manufacturer(vaccine.getManufacturer())
                .ageGroup(vaccine.getAgeGroup())
                .description(vaccine.getDescription())
                .createdDate(vaccine.getCreatedDate())
                .build();
    }

    /**
     * Xem thông tin chi tiết của một loại Vaccine theo ID.
     */
    public DetailVaccineResponse detailVaccine(DetailVaccineRequest requestBody) {
        if (ObjectUtils.isEmpty(requestBody)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        Optional<Vaccine> optionalVaccine = vaccineRepository.findById(requestBody.getId());
        if (optionalVaccine.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Vaccine không tồn tại");
        }
        return modelMapper.map(optionalVaccine.get(), DetailVaccineResponse.class);
    }

    /**
     * Nhập dữ liệu Vaccine hàng loạt từ file Excel.
     * Sử dụng thư viện Apache POI để phân tích cú pháp các dòng Excel và lưu vào DB.
     * 
     * @param file File Excel chứa danh sách vaccine tải từ client.
     */
    public void importExcelData(MultipartFile file) throws IOException {
        // Mở luồng đọc file và khởi tạo đối tượng Workbook (định dạng .xlsx)
        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            // Lấy sheet đầu tiên trong file Excel
            Sheet sheet = workbook.getSheetAt(0);
            List<Vaccine> vaccines = new ArrayList<>();

            // Duyệt qua từng hàng (Row) trong sheet
            for (Row row : sheet) {
                // Hàng 0 là hàng tiêu đề (Tên, Giá, Mô tả...), bỏ qua không import
                if (row.getRowNum() == 0) continue;

                // Lấy giá trị chuỗi hoặc số từ các ô Excel tương ứng
                String name = getCellValue(row.getCell(1));
                Integer price = (int) getCellValueAsDouble(row.getCell(2));
                String description = getCellValue(row.getCell(3));
                String status = getCellValue(row.getCell(4));
                Integer invetory = (int) getCellValueAsDouble(row.getCell(5));
                String vaccineTypeName = getCellValue(row.getCell(6));
                String manufacturerName = getCellValue(row.getCell(7));
                String ageRange = getCellValue(row.getCell(8));
                
                // Kiểm tra dữ liệu bắt buộc không được để trống, nếu sai báo lỗi chỉ rõ vị trí hàng lỗi
                if (StringUtils.isBlank(name)) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Tên không được bỏ trống tại hàng " + (row.getRowNum() + 1));
                }
                if (ObjectUtils.isEmpty(price)) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Giá không được bỏ trống tại hàng " + (row.getRowNum() + 1));
                }
                if (ObjectUtils.isEmpty(invetory)) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Số lượng không được bỏ trống tại hàng " + (row.getRowNum() + 1));
                }
                if (StringUtils.isBlank(vaccineTypeName)) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Loại vaccine không được bỏ trống tại hàng " + (row.getRowNum() + 1));
                }
                if (StringUtils.isBlank(manufacturerName)) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Nhà sản xuất không được bỏ trống tại hàng " + (row.getRowNum() + 1));
                }
                if (StringUtils.isBlank(ageRange)) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Nhóm người dùng không được bỏ trống tại hàng " + (row.getRowNum() + 1));
                }
                
                // Tìm kiếm thực thể Loại vaccine theo tên. Nếu không có trong DB thì báo lỗi.
                Optional<VaccineType> optionalVaccineType = vaccineTypeRepository.findByTypeName(vaccineTypeName);
                if (optionalVaccineType.isEmpty()) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Loại vaccine không tồn tại hàng " + (row.getRowNum() + 1));
                }
                // Tìm kiếm thực thể Nhà sản xuất theo tên. Nếu không có trong DB thì báo lỗi.
                Optional<Manufacturer> optionalManufacturer = manufacturerRepository.findByName(manufacturerName);
                if (optionalManufacturer.isEmpty()) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Nhà sản xuất không tồn tại hàng " + (row.getRowNum() + 1));
                }
                // Tìm kiếm thực thể Nhóm tuổi theo khoảng tuổi. Nếu không có trong DB thì báo lỗi.
                Optional<AgeGroup> optionalAgeGroup = ageGroupRepository.findByAgeRange(ageRange);
                if (optionalAgeGroup.isEmpty()) {
                    throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Nhóm người dùng không tồn tại hàng " + (row.getRowNum() + 1));
                }

                // Thiết lập thông tin đối tượng Vaccine mới từ dữ liệu dòng Excel
                Vaccine vaccine = new Vaccine();
                vaccine.setName(name);
                vaccine.setPrice(price);
                vaccine.setDescription(description);
                vaccine.setStatus(status);
                vaccine.setInventory(invetory);
                vaccine.setVaccineType(optionalVaccineType.get());
                vaccine.setManufacturer(optionalManufacturer.get());
                vaccine.setAgeGroup(optionalAgeGroup.get());
                vaccine.setCreatedDate(new Timestamp(System.currentTimeMillis()));
                
                // Thêm vào danh sách chờ lưu
                vaccines.add(vaccine);
            }

            // Lưu toàn bộ danh sách vaccine vào cơ sở dữ liệu (tối ưu hiệu năng thay vì lưu từng dòng)
            vaccineRepository.saveAll(vaccines);
        }
    }

    /**
     * Đọc giá trị kiểu String từ một ô (Cell) trong Excel.
     */
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

    /**
     * Đọc giá trị kiểu số nguyên từ một ô (Cell) trong Excel, hỗ trợ ép kiểu từ số thực hoặc chuỗi số.
     */
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

    /**
     * Xây dựng đặc tả (Specification) lọc Vaccine động trong JPA Criteria API.
     * 
     * @param requestBody Các tiêu chí lọc gửi từ giao diện.
     * @return Đối tượng Specification lọc các trường.
     */
    public Specification<Vaccine> specificationVaccineList(ListVaccineRequest requestBody) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Lọc theo tên vaccine gần đúng (LIKE %tên%)
            if (StringUtils.isNotEmpty(requestBody.getName())) {
                String searchValue = "%" + requestBody.getName() + "%";
                predicates.add(criteriaBuilder.like(root.get("name"), searchValue));
            }
            
            // Ràng buộc cứng: Không lấy những vaccine đã ở trạng thái xóa "DELETE"
            predicates.add(criteriaBuilder.and(criteriaBuilder.notEqual(root.get("status"), "DELETE")));
            
            // Lọc theo mức giá chính xác
            if (ObjectUtils.isNotEmpty(requestBody.getPrice())) {
                predicates.add(criteriaBuilder.and(criteriaBuilder.equal(root.get("price"), requestBody.getPrice())));
            }
            
            // Lọc theo tên Nhà sản xuất (Manufacturer) bằng join bảng
            if (ObjectUtils.isNotEmpty(requestBody.getManufacturer())) {
                predicates.add(criteriaBuilder.equal(root.get("manufacturer").get("name"), requestBody.getManufacturer()));
            }

            // Lọc vaccine được tạo ra trong khoảng thời gian (startDate đến endDate)
            if (ObjectUtils.isNotEmpty(requestBody.getStartDate()) && ObjectUtils.isNotEmpty(requestBody.getEndDate())) {
                predicates.add(criteriaBuilder.between(root.get("createdDate"), requestBody.getStartDate(), requestBody.getEndDate()));
            }
            
            // Kết hợp tất cả điều kiện bằng phép toán AND
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Tìm kiếm nhanh danh sách vaccine theo một tham số (chuỗi search) có phân trang.
     */
    public Page<Vaccine> findByParam(String search, Pageable pageable) {
        if(search == null){
            search = "";
        }
        search = "%"+search+"%";
        return vaccineRepository.findByParam(search, pageable);
    }

    /**
     * Lấy thông tin Trung tâm tiêm chủng (Center) theo tỉnh/thành phố.
     * Nếu chưa có thì tự động tạo mới trung tâm tại tỉnh/thành phố đó.
     */
    private Center getCenter(String city) {
        Optional<Center> optionalCenter = centerRepository.findByCity(city);
        if (optionalCenter.isEmpty()) {
            Center newCenter = new Center();
            newCenter.setCity(city);
            newCenter.setCenterName(city);
            newCenter.setCreatedDate(new Timestamp(System.currentTimeMillis()));
            centerRepository.save(newCenter);
            return newCenter;
        }
        return optionalCenter.get();
    }

    /**
     * Tìm Vaccine theo ID. Ném ngoại lệ ngầm định nếu không tồn tại.
     */
    public Vaccine findById(Long id) {
        return vaccineRepository.findById(id).get();
    }
}
