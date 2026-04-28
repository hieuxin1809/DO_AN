package com.web.service;

import com.web.dto.ScheduleTimeDto;
import com.web.dto.VaccineScheduleTimeResponse;
import com.web.entity.VaccineSchedule;
import com.web.entity.VaccineScheduleTime;
import com.web.exception.MessageException;
import com.web.repository.VaccineScheduleRepository;
import com.web.repository.VaccineScheduleTimeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.sql.Time;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
public class VaccineScheduleTimeService {

    @Autowired
    private VaccineScheduleTimeRepository vaccineScheduleTimeRepository;

    @Autowired
    private VaccineScheduleRepository vaccineScheduleRepository;

    public List<VaccineScheduleTime> createMulti(ScheduleTimeDto dto){
        VaccineSchedule vaccineSchedule = vaccineScheduleRepository.findById(dto.getScheduleId()).get();
        List<VaccineScheduleTime> list = new ArrayList<>();
        Time startTime = dto.getStartTime();
        Time endTime = dto.getEndTime();
        Integer numHour = dto.getNumHour();
        Integer maxPeople = dto.getMaxPeople();
        if (startTime.getMinutes() != 0 || endTime.getMinutes() != 0) {
            throw new MessageException("Phải dùng giờ chẵn để thực hiện");
        }
        // Tính tổng số phút giữa startTime và endTime
        long diffInMilliSeconds = endTime.getTime() - startTime.getTime();
        long diffInMinutes = TimeUnit.MILLISECONDS.toMinutes(diffInMilliSeconds); // chuyển từ milliseconds sang phút

        // Tính tổng số lượng khoảng thời gian, mỗi khoảng là numHour giờ (numHour * 60 phút)
        int slotDurationInMinutes = numHour * 60; // mỗi slot có numHour giờ (60 phút)
        int numSlots = (int) (diffInMinutes / slotDurationInMinutes);
        if (diffInMinutes % slotDurationInMinutes != 0) {
            numSlots++; // Thêm 1 slot nếu có khoảng thời gian dư
        }

        // Tính số lượng người cho từng khoảng thời gian
        int peoplePerSlot = maxPeople / numSlots; // Số người cho mỗi slot
        int remainder = maxPeople % numSlots; // Số người dư

        // Tạo danh sách phân bổ số người
        List<Integer> peopleDistribution = new ArrayList<>();

        // Thêm số người vào danh sách cho các khoảng thời gian
        for (int i = 0; i < numSlots; i++) {
            if (i < numSlots - 1) {
                peopleDistribution.add(peoplePerSlot); // Các slot đầu nhận số người chia đều
            } else {
                peopleDistribution.add(peoplePerSlot + remainder); // Slot cuối nhận số người dư
            }
        }

        // Kiểm tra và hoán đổi số lượng người giữa slot đầu và slot cuối nếu cần
        if (peopleDistribution.size() > 1 && peopleDistribution.get(peopleDistribution.size() - 1) > peopleDistribution.get(0)) {
            // Hoán đổi
            int temp = peopleDistribution.get(0);
            peopleDistribution.set(0, peopleDistribution.get(peopleDistribution.size() - 1));
            peopleDistribution.set(peopleDistribution.size() - 1, temp);
        }

        // In ra kết quả
        System.out.println("Tổng số khoảng thời gian: " + numSlots);

        // In ra thời gian cụ thể cho từng slot
        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm");
        long currentTimeInMillis = startTime.getTime(); // Thời gian hiện tại bắt đầu từ startTime

        for (int i = 0; i < peopleDistribution.size(); i++) {
            long slotEndTimeInMillis = currentTimeInMillis + slotDurationInMinutes * 60 * 1000; // Thời gian kết thúc của mỗi slot

            // Nếu thời gian kết thúc của slot vượt quá endTime, thì điều chỉnh lại thời gian kết thúc
            if (slotEndTimeInMillis > endTime.getTime()) {
                slotEndTimeInMillis = endTime.getTime();
            }

            // In ra khoảng thời gian từ start đến end cho từng slot
            System.out.println("Khoảng thời gian " + timeFormat.format(new Time(currentTimeInMillis))
                    + " - " + timeFormat.format(new Time(slotEndTimeInMillis))
                    + ": " + peopleDistribution.get(i) + " người");

            VaccineScheduleTime vaccineScheduleTime = new VaccineScheduleTime();
            vaccineScheduleTime.setVaccineSchedule(vaccineSchedule);
            vaccineScheduleTime.setEnd(new Time(slotEndTimeInMillis));
            vaccineScheduleTime.setStart(new Time(currentTimeInMillis));
            vaccineScheduleTime.setInjectDate(dto.getDate());
            vaccineScheduleTime.setLimitPeople(peopleDistribution.get(i));
            list.add(vaccineScheduleTime);

            currentTimeInMillis = slotEndTimeInMillis;

            // Kiểm tra xem nếu currentTimeInMillis đã đạt endTime thì thoát khỏi vòng lặp
            if (currentTimeInMillis >= endTime.getTime()) {
                break;
            }
        }
        Integer tong = 0;
        for(VaccineScheduleTime v : list){
            tong += v.getLimitPeople();
        }
        Long count = vaccineScheduleTimeRepository.quantityBySchedule(dto.getScheduleId());
        if(count == null){
            count = 0L;
        }
        if(vaccineSchedule.getLimitPeople() < count + tong){
            throw new MessageException("Số lượng mũi tiêm hiện tại đang phát hành là: "+count+" chỉ được phát hành thêm: "+(vaccineSchedule.getLimitPeople() - count)+" mũi tiêm");
        }
        vaccineScheduleTimeRepository.saveAll(list);
        return list;
    }

    public List<VaccineScheduleTime> findBySchedule(Long scheduleId){
        return vaccineScheduleTimeRepository.findByVaccineSchedule(scheduleId);
    }

    public Set<Date> findDateBySchedule(Long scheduleId){
        LocalDate localDate = LocalDate.now();
        Date sqlDate = Date.valueOf(localDate);
        return vaccineScheduleTimeRepository.findDateByVaccineSchedule(scheduleId, sqlDate);
    }

    public VaccineScheduleTime update(VaccineScheduleTime vaccineScheduleTime){
        VaccineScheduleTime ex = vaccineScheduleTimeRepository.findById(vaccineScheduleTime.getId()).get();
        ex.setStart(vaccineScheduleTime.getStart());
        ex.setEnd(vaccineScheduleTime.getEnd());
        ex.setLimitPeople(vaccineScheduleTime.getLimitPeople());
        vaccineScheduleTimeRepository.save(ex);
        return ex;
    }

    public VaccineScheduleTime save(VaccineScheduleTime vaccineScheduleTime){
        Long count = vaccineScheduleTimeRepository.quantityBySchedule(vaccineScheduleTime.getVaccineSchedule().getId());
        VaccineSchedule vaccineSchedule = vaccineScheduleRepository.findById(vaccineScheduleTime.getVaccineSchedule().getId()).get();
        if(count == null){
            count = 0L;
        }
        if(vaccineSchedule.getLimitPeople() < count + vaccineScheduleTime.getLimitPeople()){
            throw new MessageException("Số lượng mũi tiêm hiện tại đang phát hành là: "+count+" chỉ được phát hành thêm: "+(vaccineSchedule.getLimitPeople() - count)+" mũi tiêm");
        }
        vaccineScheduleTimeRepository.save(vaccineScheduleTime);
        return vaccineScheduleTime;
    }

    public void delete(Long id) {
        vaccineScheduleTimeRepository.deleteById(id);
    }

    public List<VaccineScheduleTimeResponse> findTimeBySchedule(Long idSchedule, Date date) {
        return vaccineScheduleTimeRepository.findTimeBySchedule(idSchedule, date);
    }

    public VaccineScheduleTime findById(Long id) {
        return vaccineScheduleTimeRepository.findById(id).get();
    }


//    public static void main(String[] args) {
//        Time startTime = Time.valueOf("08:00:00");
//        Time endTime = Time.valueOf("19:00:00");
//        ScheduleTimeDto schedule = new ScheduleTimeDto(startTime, endTime, 2, 100);
//
//        new VaccineScheduleTimeService().createMulti(schedule);
//    }
}
