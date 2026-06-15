package com.web.service;

import com.web.api.VaccineScheduleApi;
import com.web.entity.Center;
import com.web.entity.CustomerSchedule;
import com.web.entity.Vaccine;
import com.web.entity.VaccineInventory;
import com.web.entity.VaccineSchedule;
import com.web.exception.MessageException;
import com.web.repository.CenterRepository;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.VaccineInventoryRepository;
import com.web.repository.VaccineRepository;
import com.web.repository.VaccineScheduleRepository;
import com.web.repository.VaccineScheduleTimeRepository;
import com.web.utils.MailService;
import com.web.utils.UserUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
/**
 * Service quan ly lich tiem chung chung tai cac co so.
 */
public class VaccineScheduleService {
    private static final Logger log = LoggerFactory.getLogger(VaccineScheduleApi.class);

    @Autowired
    private VaccineScheduleRepository vaccineScheduleRepository;

    @Autowired
    private VaccineScheduleTimeRepository vaccineScheduleTimeRepository;

    @Autowired
    private CustomerScheduleRepository customerScheduleRepository;

    @Autowired
    private UserUtils userUtils;

    @Autowired
    private VaccineRepository vaccineRepository;

    @Autowired
    private VaccineInventoryRepository vaccineInventoryRepository;

    @Autowired
    private CenterRepository centerRepository;

    @Autowired
    private MailService mailService;

    /* ── helper: load full Center entity từ DB để lấy centerName ── */
    private Center resolveCenter(Center center) {
        if (center == null || center.getId() == null) return null;
        if (center.getCenterName() != null) return center; // đã có đủ thông tin
        return centerRepository.findById(center.getId()).orElse(center);
    }

    /* ── helper: lấy VaccineInventory theo vaccine + center ─── */
    private VaccineInventory getInventoryForCenter(Vaccine vaccine, Center center) {
        Center fullCenter = resolveCenter(center);
        if (fullCenter == null) {
            throw new MessageException("Lịch tiêm chưa được gán trung tâm, vui lòng chọn trung tâm");
        }
        Optional<VaccineInventory> opt = vaccineInventoryRepository.findByVaccineAndCenter(vaccine, fullCenter);
        if (opt.isEmpty()) {
            String centerName = fullCenter.getCenterName() != null ? fullCenter.getCenterName() : ("ID " + fullCenter.getId());
            throw new MessageException("Chưa xuất kho vaccine '" + vaccine.getName() + "' tại trung tâm " + centerName);
        }
        return opt.get();
    }

    /*
    * api này dùng để thêm lịch tiêm vaccine
    * */
    public VaccineSchedule save(VaccineSchedule vaccineSchedule) {
        Vaccine vaccine = vaccineRepository.findById(vaccineSchedule.getVaccine().getId()).get();

        // Kiểm tra tồn kho theo trung tâm
        Center scheduleCenter = resolveCenter(vaccineSchedule.getCenter());
        VaccineInventory vaccineInventory = getInventoryForCenter(vaccine, scheduleCenter);
        int exported = vaccineInventory.getExportedQuantity() != null ? vaccineInventory.getExportedQuantity() : 0;
        if (exported < vaccineSchedule.getLimitPeople()) {
            String cName = scheduleCenter != null && scheduleCenter.getCenterName() != null
                    ? scheduleCenter.getCenterName() : "trung tâm đã chọn";
            throw new MessageException("Vaccine không đủ số lượng tại " + cName
                    + ", chỉ còn " + exported + " đã xuất kho");
        }

        if (vaccineSchedule.getStartDate().after(vaccineSchedule.getEndDate())) {
            throw new MessageException("Ngày bắt đầu không được sau ngày kết thúc");
        }
        if (vaccineSchedule.getStartDate().before(new java.util.Date(System.currentTimeMillis()))) {
            throw new MessageException("Ngày bắt đầu phải sau ngày hiện tại");
        }
        vaccineSchedule.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        vaccineSchedule.setUser(userUtils.getUserWithAuthority());
        vaccineScheduleRepository.save(vaccineSchedule);

        // Trừ exportedQuantity theo trung tâm
        vaccineInventory.setExportedQuantity(exported - vaccineSchedule.getLimitPeople());
        vaccineInventoryRepository.save(vaccineInventory);

        return vaccineSchedule;
    }

    public static int getRoundedMonthsBetween(Date startDate, Date endDate) {
        LocalDate start = startDate.toLocalDate();
        LocalDate end = endDate.toLocalDate();
        Period period = Period.between(start, end);
        int months = period.getYears() * 12 + period.getMonths();
        if (period.getDays() > 0) {
            months += 1;
        }
        return months;
    }

    public static List<Date> getDatesBetween(Date startDate, Date endDate) {
        List<Date> dates = new ArrayList<>();
        LocalDate start = startDate.toLocalDate();
        LocalDate end = endDate.toLocalDate();
        while (!start.isAfter(end)) {
            dates.add(Date.valueOf(start));
            start = start.plusDays(1);
        }
        return dates;
    }

    /*
     * api này dùng để cập nhật lịch tiêm vaccine
     * */
    public VaccineSchedule update(VaccineSchedule vaccineSchedule) {
        if (vaccineSchedule.getId() == null) {
            throw new MessageException("Id không được null");
        }
        Optional<VaccineSchedule> exist = vaccineScheduleRepository.findById(vaccineSchedule.getId());
        if (exist.isEmpty()) {
            throw new MessageException("Không tìm thấy lịch tiêm có id: " + vaccineSchedule.getId());
        }
        if (vaccineSchedule.getStartDate().after(vaccineSchedule.getEndDate())) {
            throw new MessageException("Ngày bắt đầu không được sau ngày kết thúc");
        }
        if (vaccineSchedule.getStartDate().before(new java.util.Date(System.currentTimeMillis()))) {
            throw new MessageException("Ngày bắt đầu phải sau ngày hiện tại");
        }
        Long num = vaccineScheduleTimeRepository.quantityBySchedule(vaccineSchedule.getId());
        if (num == null) {
            num = 0L;
        }
        if (num > vaccineSchedule.getLimitPeople()) {
            throw new MessageException("Số lượng mũi tiêm đã phát hành là: " + num + ", số mũi tiêm bạn cập nhật không chính xác");
        }

        Vaccine vaccine = vaccineRepository.findById(vaccineSchedule.getVaccine().getId()).get();
        Center center = vaccineSchedule.getCenter() != null ? vaccineSchedule.getCenter() : exist.get().getCenter();

        // Hoàn lại exportedQuantity cũ, trừ exportedQuantity mới theo trung tâm
        VaccineInventory vaccineInventory = getInventoryForCenter(vaccine, center);
        int oldLimit = exist.get().getLimitPeople() != null ? exist.get().getLimitPeople() : 0;
        int currentExported = vaccineInventory.getExportedQuantity() != null ? vaccineInventory.getExportedQuantity() : 0;
        int availableAfterReturn = currentExported + oldLimit;
        if (availableAfterReturn < vaccineSchedule.getLimitPeople()) {
            throw new MessageException("Vaccine không đủ số lượng tại trung tâm, chỉ còn " + availableAfterReturn + " sau khi hoàn lại");
        }

        vaccineSchedule.setCreatedDate(exist.get().getCreatedDate());
        vaccineSchedule.setUser(exist.get().getUser());
        vaccineScheduleRepository.save(vaccineSchedule);

        vaccineInventory.setExportedQuantity(availableAfterReturn - vaccineSchedule.getLimitPeople());
        vaccineInventoryRepository.save(vaccineInventory);

        return vaccineSchedule;
    }

    /*
     * api này dùng để xóa lịch tiêm vaccine
     * */
    public void delete(Long id) {
        try {
            VaccineSchedule vaccineSchedule = vaccineScheduleRepository.findById(id).get();
            Vaccine vaccine = vaccineSchedule.getVaccine();
            Center center = vaccineSchedule.getCenter();
            Integer limitPeople = vaccineSchedule.getLimitPeople();
            vaccineScheduleRepository.deleteById(id);

            // Hoàn lại exportedQuantity theo trung tâm
            if (center != null && limitPeople != null) {
                Optional<VaccineInventory> optInv = vaccineInventoryRepository.findByVaccineAndCenter(vaccine, center);
                if (optInv.isPresent()) {
                    VaccineInventory inv = optInv.get();
                    int prev = inv.getExportedQuantity() != null ? inv.getExportedQuantity() : 0;
                    inv.setExportedQuantity(prev + limitPeople);
                    vaccineInventoryRepository.save(inv);
                }
            }
        } catch (Exception e) {
            throw new MessageException("Lịch tiêm này đã được đăng ký, không thể xóa");
        }
    }

    /*
     * api này dùng để lấy danh sách lịch tiêm vaccine, truyền vào ngày bắt đầu và kết thúc
     * nếu không truyền ngày bd hoặc kt thì lấy mặc định tất cả
     * */
    public Page<VaccineSchedule> vaccineSchedules(Date from, Date to, String search, Pageable pageable) {
        Page<VaccineSchedule> page = null;
        if (search == null) {
            search = "";
        }
        search = "%" + search + "%";
        if (from == null || to == null) {
            page = vaccineScheduleRepository.findByParam(search, pageable);
        } else {
            page = vaccineScheduleRepository.findByDateAndParam(from, to, search, pageable);
        }
        return page;
    }

    public List<VaccineSchedule> findByVacxin(Long vacxinId) {
        LocalDateTime now = LocalDateTime.now();
        List<VaccineSchedule> list = vaccineScheduleRepository.findByVacxin(vacxinId, now);
        return list;
    }

    public VaccineSchedule findById(Long id) {
        Optional<VaccineSchedule> vaccineSchedule = vaccineScheduleRepository.findById(id);
        if (vaccineSchedule.isEmpty()) {
            throw new MessageException("Không tìm thấy lịch tiêm với id: " + id);
        }
        return vaccineSchedule.get();
    }

    public Page<VaccineSchedule> nextSchedule(String param, Pageable pageable) {
        if (param == null) {
            param = "";
        }
        param = "%" + param + "%";
        Page<VaccineSchedule> page = vaccineScheduleRepository.findByParam(param, new Date(System.currentTimeMillis()), pageable);
        for (VaccineSchedule v : page.getContent()) {
            if (customerScheduleRepository.countRegis(v.getId()) < v.getLimitPeople()) {
                v.setInStock(true);
            }
        }
        return page;
    }

    public Page<VaccineSchedule> preSchedule(String param, Pageable pageable) {
        if (param == null) {
            param = "";
        }
        param = "%" + param + "%";
        Pageable sortedPageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdDate")
        );
        Page<VaccineSchedule> page = vaccineScheduleRepository.preFindByParam(param, new Date(System.currentTimeMillis()), sortedPageable);
        return page;
    }

    public List<VaccineSchedule> list() {
        return vaccineScheduleRepository.findAll();
    }

    public List<VaccineSchedule> getCenter(Date start, Long vaccineId) {
        List<VaccineSchedule> list = new ArrayList<>();
        if (start == null) {
            start = new Date(System.currentTimeMillis());
        }
        if (start.toLocalDate().isBefore(LocalDate.now())) {
            throw new MessageException("Thời gian tối thiểu phải bắt đầu từ ngày hiện tại");
        }
        list = vaccineScheduleRepository.getCenter(start, vaccineId);
        return list;
    }

    public Page<VaccineSchedule> advancedSearch(
            String vaccineName,
            String centerName,
            LocalDate fromDate,
            LocalDate toDate,
            String status,
            Pageable pageable) {

        log.info("Service Layer - fromDate: {}, toDate: {}, status: {}", fromDate, toDate, status);

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("Ngày bắt đầu không thể lớn hơn ngày kết thúc");
        }

        return vaccineScheduleRepository.findAdvancedSearch(
                vaccineName,
                centerName,
                fromDate,
                toDate,
                status,
                pageable
        );
    }
}
