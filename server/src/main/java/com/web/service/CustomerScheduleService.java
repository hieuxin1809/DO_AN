package com.web.service;
import com.web.enums.*;
import com.web.models.UpdateCustomerSchedule;
import com.web.config.Environment;
import com.web.constants.LogUtils;
import com.web.dto.CustomerScheduleVnpay;
import com.web.dto.PaymentRequest;
import com.web.entity.*;
import com.web.exception.MessageException;
import com.web.models.ApproveCustomerScheduleRequest;
import com.web.models.ApproveCustomerScheduleResponse;
import com.web.models.AssignDoctorNurseRequest;
import com.web.models.CreateScheduleGuestRequest;
import com.web.models.CreateScheduleGuestResponse;
import com.web.models.ListCustomerScheduleRequest;
import com.web.models.ListCustomerScheduleResponse;
import com.web.models.QueryStatusTransactionResponse;
import com.web.processor.QueryTransactionStatus;
import com.web.repository.*;
import com.web.service.VaccinePersonalizationService;
import com.web.utils.EmailTemplateUtils;
import com.web.utils.MailService;
import com.web.utils.UserUtils;
import com.web.vnpay.VNPayService;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestParam;

import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import javax.persistence.EntityNotFoundException;
import javax.persistence.criteria.Predicate;
import java.security.SecureRandom;
import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

@Component
public class CustomerScheduleService {
    @Autowired
    private AuthorityRepository authorityRepository;

    @Autowired
    private CustomerScheduleRepository customerScheduleRepository;

    @Autowired
    private UserUtils userUtils;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private VaccineScheduleRepository vaccineScheduleRepository;

    @Autowired
    private VaccineScheduleTimeRepository vaccineScheduleTimeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VNPayService vnPayService;

    @Autowired
    private MailService mailService;

    @Autowired
    private VaccinePersonalizationService vaccinePersonalizationService;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private NurseRepository nurseRepository;

    public CustomerSchedule create(CustomerSchedule customerSchedule, String orderId, String requestId) {
        LogUtils.init();
        if (paymentRepository.findByOrderIdAndRequestId(orderId, requestId).isPresent()) {
            throw new MessageException("Không được thực hiện hành động này");
        }
        Environment environment = Environment.selectEnv("dev");
        try {
            QueryStatusTransactionResponse queryStatusTransactionResponse = QueryTransactionStatus.process(environment, orderId, requestId);
            System.out.println("qqqq-----------------------------------------------------------" + queryStatusTransactionResponse.getMessage());
            if (queryStatusTransactionResponse.getResultCode() != 0) {
                throw new MessageException("Chưa được thanh toán");
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new MessageException("Chưa được thanh toán");
        }
        User user = userUtils.getUserWithAuthority();
        customerSchedule.setUser(user);
        customerSchedule.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        customerSchedule.setStatusCustomerSchedule(StatusCustomerSchedule.pending);
        customerScheduleRepository.save(customerSchedule);

        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(customerSchedule.getVaccineScheduleTime().getId()).get();
        Payment payment = new Payment();
        payment.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        payment.setCreatedBy(user);
        payment.setCustomerSchedule(customerSchedule);
        payment.setAmount(vaccineScheduleTime.getVaccineSchedule().getVaccine().getPrice());
        payment.setOrderId(orderId);
        payment.setRequestId(requestId);
        paymentRepository.save(payment);
        return customerSchedule;
    }

    public Page<CustomerSchedule> mySchedule(Pageable pageable, String search,Date from,Date to) {
        User user = userUtils.getUserWithAuthority();
        if(search == null){
            search = "";
        }
        search = "%"+search+"%";
        if(from == null || to == null){
            from = Date.valueOf("2000-01-01");
            to = Date.valueOf("2100-01-01");
        }
        Page<CustomerSchedule> list = customerScheduleRepository.findByUser(user.getId(), search,from, to, pageable);
        return list;
    }

    public void cancel(Long id) {
        Optional<CustomerSchedule> customerSchedule = customerScheduleRepository.findById(id);
        if (customerSchedule.isEmpty()) {
            throw new MessageException("Không tìm thấy lịch đã đăng ký");
        }
        if (customerSchedule.get().getUser().getId() != userUtils.getUserWithAuthority().getId()) {
            throw new MessageException("Bạn không đủ quyền");
        }
        if (customerSchedule.get().getStatusCustomerSchedule().equals(StatusCustomerSchedule.cancelled)) {
            throw new MessageException("Không được lặp lại hành động");
        }
        customerSchedule.get().setStatusCustomerSchedule(StatusCustomerSchedule.cancelled);
        customerScheduleRepository.save(customerSchedule.get());
    }

    public Page<ListCustomerScheduleResponse> listCustomerSchedule(ListCustomerScheduleRequest request) {

        if (ObjectUtils.isEmpty(request)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }

        Pageable pageable = PageRequest.of(request.getPage() - 1, request.getLimit(), Sort.by(Sort.Direction.DESC, "createdDate"));
        Page<CustomerSchedule> customerSchedulePage = customerScheduleRepository.findAll(specificationCustomerScheduleList(request), pageable);

        List<ListCustomerScheduleResponse> list = customerSchedulePage.stream().map(e ->
                {
                    Optional<User> user = userRepository.findById(e.getUser().getId());
                    Optional<VaccineScheduleTime> vaccineScheduleTime = vaccineScheduleTimeRepository.findById(e.getVaccineScheduleTime().getId());

                    return ListCustomerScheduleResponse.builder()
                            .id(e.getId())
                            .status(e.getStatusCustomerSchedule().name())
                            .fullName(e.getFullName())
                            .createdDate(e.getCreatedDate())
                            .vaccineScheduleTime(vaccineScheduleTime.orElse(null))
                            .user(user.orElse(null))
                            .note(e.getNote())
                            .payStatus(e.getCustomerSchedulePay() != null &&
                                    (e.getCustomerSchedulePay() == CustomerSchedulePay.THANH_TOAN_MOMO ||
                                            e.getCustomerSchedulePay() == CustomerSchedulePay.THANH_TOAN_VNPAY))
                            .healthStatusAfter(e.getHealthStatusAfter())
                            .healthStatusBefore(e.getHealthStatusBefore())
                            .completedDate(e.getCompletedDate())
                            .doctor(e.getDoctor())
                            .nurse(e.getNurse())
                            .build();
                }
        ).toList();
        return new PageImpl<>(list, pageable, customerSchedulePage.getTotalElements());

    }

    public Specification<CustomerSchedule> specificationCustomerScheduleList(ListCustomerScheduleRequest requestBody) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.isNotEmpty(requestBody.getFullName())) {
                String searchValue = "%" + requestBody.getFullName() + "%";
                predicates.add(criteriaBuilder.like(root.get("fullName"), searchValue));
            }
            if (ObjectUtils.isNotEmpty(requestBody.getStatus())) {
                predicates.add(criteriaBuilder.and(criteriaBuilder.equal(root.get("statusCustomerSchedule"), StatusCustomerSchedule.valueOf(requestBody.getStatus()))));
            }

            // Tìm kiếm theo vaccineScheduleId
            if (ObjectUtils.isNotEmpty(requestBody.getVaccineScheduleId())) {
                predicates.add(criteriaBuilder.equal(root.get("vaccineScheduleTime").get("vaccineSchedule").get("id"), requestBody.getVaccineScheduleId()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
    @Transactional(rollbackFor = Exception.class)
    public CreateScheduleGuestResponse createScheduleGuest(CreateScheduleGuestRequest request) {
        if (ObjectUtils.isEmpty(request)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Thông tin đăng ký không hợp lệ");
        }

        Optional<User> optionalUser = userRepository.findByEmail(request.getEmail());
        User user;
        boolean isNewUser = false;


        String generatedPassword = null;
        if (optionalUser.isPresent()) {
            user = optionalUser.get();
        } else {
            Optional<User> optionalUserPhone = userRepository.findByPhoneNumber(request.getPhone());
            if (optionalUserPhone.isPresent()) {
                throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Số điện thoại đã được sử dụng");
            }

            isNewUser = true;
            generatedPassword = generateRandomPassword();
            String encodedPassword = passwordEncoder.encode(generatedPassword);

            user = User.builder()
                    .email(request.getEmail())
                    .createdDate(new Date(System.currentTimeMillis()))
                    .phoneNumber(request.getPhone())
                    .authorities(authorityRepository.findById(4L).get())
                    .password(encodedPassword)
                    .userType(UserType.standard)
                    .actived(true)
                    .build();
            userRepository.save(user);
        }

        VaccineScheduleTime vaccineScheduleTime;
        if (request.getVaccineScheduleTimeId() != null) {
            vaccineScheduleTime = vaccineScheduleTimeRepository.findById(request.getVaccineScheduleTimeId())
                    .orElseThrow(() -> new MessageException(HttpStatus.BAD_REQUEST.value(), "Giờ tiêm không tồn tại"));
        } else {
            vaccineScheduleTime = findAvailableVaccineScheduleTime(request.getVaccineScheduleId());
        }

        CustomerSchedule customerSchedule = CustomerSchedule.builder()
                .statusCustomerSchedule(StatusCustomerSchedule.pending)
                .fullName(request.getFullName())
                .vaccineScheduleTime(vaccineScheduleTime)
                .phone(request.getPhone())
                .customerSchedulePay(CustomerSchedulePay.CHUA_THANH_TOAN)
                .address(request.getAddress())
                .createdDate(new Timestamp(System.currentTimeMillis()))
                .user(user)
                .build();
        customerScheduleRepository.save(customerSchedule);

        sendScheduleAndAccountNotificationEmail(
                user,
                isNewUser,
                generatedPassword,
                customerSchedule,
                vaccineScheduleTime
        );

        return CreateScheduleGuestResponse.builder()
                .vaccineScheduleTime(vaccineScheduleTime)
                .createdDate(customerSchedule.getCreatedDate())
                .fullName(customerSchedule.getFullName())
                .id(customerSchedule.getId())
                .user(user)
                .status(customerSchedule.getStatusCustomerSchedule().name())
                .build();
    }

    public ApproveCustomerScheduleResponse approveCustomerSchedule(ApproveCustomerScheduleRequest request) {
        if (ObjectUtils.isEmpty(request)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        Optional<CustomerSchedule> optionalVaccineSchedule = customerScheduleRepository.findById(request.getCustomerScheduleId());
        if (ObjectUtils.isEmpty(optionalVaccineSchedule)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Lịch tiêm của khách không tồn tại");
        }
        CustomerSchedule customerSchedule = optionalVaccineSchedule.get();
        StatusCustomerSchedule newStatus;
        switch (request.getStatus()) {
            case "confirmed":     newStatus = StatusCustomerSchedule.confirmed;     break;
            case "cancelled":     newStatus = StatusCustomerSchedule.cancelled;     break;
            case "injected":      newStatus = StatusCustomerSchedule.injected;      break;
            case "finished":      newStatus = StatusCustomerSchedule.finished;      break;
            case "not_injected":  newStatus = StatusCustomerSchedule.not_injected;  break;
            default: throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Trang thai khong hop le: " + request.getStatus());
        }
        customerSchedule.setStatusCustomerSchedule(newStatus);
        if (newStatus == StatusCustomerSchedule.injected
                || newStatus == StatusCustomerSchedule.cancelled
                || newStatus == StatusCustomerSchedule.finished
                || newStatus == StatusCustomerSchedule.not_injected) {
            customerSchedule.setCompletedDate(new Timestamp(System.currentTimeMillis()));
        }
        customerScheduleRepository.save(customerSchedule);
        sendEmailToCustomer(customerSchedule);
        return ApproveCustomerScheduleResponse.builder().status(request.getStatus()).build();
    }


    private void sendEmailToCustomer(CustomerSchedule customerSchedule) {
        String to = customerSchedule.getUser().getEmail();
        String status = customerSchedule.getStatusCustomerSchedule().name();
        String vaccineName = customerSchedule.getVaccineScheduleTime() != null
                && customerSchedule.getVaccineScheduleTime().getVaccineSchedule() != null
                ? customerSchedule.getVaccineScheduleTime().getVaccineSchedule().getVaccine().getName()
                : "Vaccine";
        String subject;
        switch (customerSchedule.getStatusCustomerSchedule()) {
            case confirmed:    subject = "[iVaccine] Lịch tiêm đã được xác nhận"; break;
            case cancelled:    subject = "[iVaccine] Lịch tiêm đã bị hủy"; break;
            case injected:     subject = "[iVaccine] Xác nhận đã tiêm vaccine"; break;
            case finished:     subject = "[iVaccine] Lịch tiêm hoàn thành"; break;
            case not_injected: subject = "[iVaccine] Thông báo chưa tiêm đúng lịch"; break;
            default:           subject = "[iVaccine] Cập nhật lịch tiêm"; break;
        }
        String customerName = customerSchedule.getFullName() != null ? customerSchedule.getFullName() : "Khách hàng";
        String html = EmailTemplateUtils.bookingStatusUpdate(customerName, vaccineName, status);
        mailService.sendEmail(to, subject, html, false, true);
    }
//    private VaccineScheduleTime findOrCreateVaccineScheduleTime(Long vaccineScheduleId) {
//        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findFirstByVaccineScheduleId(vaccineScheduleId);
//        if (vaccineScheduleTime == null) {
//            VaccineSchedule vaccineSchedule = vaccineScheduleRepository.findById(vaccineScheduleId)
//                    .orElseThrow(() -> new MessageException(HttpStatus.BAD_REQUEST.value(), "Không tìm thấy lịch tiêm"));
//
//            // Tạo khung giờ sáng
//            vaccineScheduleTime = createVaccineScheduleTime(vaccineSchedule, "08:00:00", "12:00:00");
//
//            // Tạo khung giờ chiều
//            createVaccineScheduleTime(vaccineSchedule, "13:00:00", "17:00:00");
//        }
//        return vaccineScheduleTime;
//    }
    private VaccineScheduleTime createVaccineScheduleTime(VaccineSchedule vaccineSchedule, String startTime, String endTime) {
        VaccineScheduleTime scheduleTime = new VaccineScheduleTime();
        scheduleTime.setInjectDate(new Date(System.currentTimeMillis()));
        scheduleTime.setStart(Time.valueOf(startTime));
        scheduleTime.setEnd(Time.valueOf(endTime));

        scheduleTime.setLimitPeople(100);
        scheduleTime.setVaccineSchedule(vaccineSchedule);
        return vaccineScheduleTimeRepository.save(scheduleTime);
    }
    private void sendScheduleAndAccountNotificationEmail(
            User user,
            boolean isNewUser,
            String generatedPassword,
            CustomerSchedule customerSchedule,
            VaccineScheduleTime vaccineScheduleTime) {

        String subject = isNewUser
                ? "[iVaccine] Tài khoản và lịch tiêm của bạn đã được tạo"
                : "[iVaccine] Xác nhận đặt lịch tiêm chủng";

        String timeSlot = vaccineScheduleTime.getStart() + " - " + vaccineScheduleTime.getEnd();
        String injectDate = vaccineScheduleTime.getInjectDate().toString();
        String centerName = vaccineScheduleTime.getVaccineSchedule() != null
                && vaccineScheduleTime.getVaccineSchedule().getCenter() != null
                ? vaccineScheduleTime.getVaccineSchedule().getCenter().getCenterName()
                : "iVaccine";

        String html = EmailTemplateUtils.newAccountWithBooking(
                customerSchedule.getFullName(),
                user.getEmail(),
                generatedPassword != null ? generatedPassword : "",
                vaccineScheduleTime.getVaccineSchedule().getVaccine().getName(),
                injectDate,
                timeSlot,
                isNewUser
        );

        mailService.sendEmail(user.getEmail(), subject, html, false, true);
    }

    private String generateRandomPassword() {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
        StringBuilder password = new StringBuilder();
        SecureRandom random = new SecureRandom();

        for (int i = 0; i < 12; i++) {
            password.append(characters.charAt(random.nextInt(characters.length())));
        }

        return password.toString();
    }


    private VaccineScheduleTime findAvailableVaccineScheduleTime(Long vaccineScheduleId) {
        List<VaccineScheduleTime> availableSlots = vaccineScheduleTimeRepository.findAllByVaccineScheduleId(vaccineScheduleId);

        if (availableSlots == null || availableSlots.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Lịch tiêm này chưa cập nhập slot.");
        }

        // Kiểm tra từng slot để tìm slot còn chỗ
        for (VaccineScheduleTime slot : availableSlots) {
            Long currentRegistrations = customerScheduleRepository.countByVaccineScheduleTimeId(slot.getId());
            if (currentRegistrations < slot.getLimitPeople()) {
                return slot; // Slot còn chỗ, trả về slot này
            }
        }

        // Nếu không tìm được slot nào còn chỗ
        throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Tất cả các slot trong lịch tiêm đã hết chỗ.");
    }


    public CustomerSchedule createNotPay(CustomerSchedule customerSchedule) {
        User user = userUtils.getUserWithAuthority();
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(customerSchedule.getVaccineScheduleTime().getId()).get();
        CustomerSchedule result = save(customerSchedule, null, null);
        String _html1 = EmailTemplateUtils.paymentReminder(customerSchedule.getFullName() != null ? customerSchedule.getFullName() : user.getEmail(), vaccineScheduleTime.getVaccineSchedule().getVaccine().getName(), "24 giờ kể từ lúc đăng ký");
        mailService.sendEmail(user.getEmail(), "[iVaccine] Hoàn tất thanh toán lịch tiêm", _html1, false, true);
        return result;
    }

    public CustomerSchedule createVnPay(CustomerScheduleVnpay customerScheduleVnpay) {
        if(paymentRepository.findByOrderIdAndRequestId(customerScheduleVnpay.getVnpOrderInfo(),customerScheduleVnpay.getVnpOrderInfo()).isPresent()){
            throw new MessageException("Lịch đặt đã được thanh toán");
        }
        int paymentStatus = vnPayService.orderReturnByUrl(customerScheduleVnpay.getVnpayUrl());
        if(paymentStatus != 1){
            throw new MessageException("Thanh toán thất bại");
        }
        User user = userUtils.getUserWithAuthority();
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(customerScheduleVnpay.getCustomerSchedule().getVaccineScheduleTime().getId()).get();
        CustomerSchedule result = save(customerScheduleVnpay.getCustomerSchedule(), PayType.VNPAY, customerScheduleVnpay.getVnpOrderInfo());
        String _htmlVnp = EmailTemplateUtils.bookingConfirmation(
                customerScheduleVnpay.getCustomerSchedule().getFullName() != null ? customerScheduleVnpay.getCustomerSchedule().getFullName() : user.getEmail(),
                vaccineScheduleTime.getVaccineSchedule().getVaccine().getName(),
                vaccineScheduleTime.getInjectDate() != null ? vaccineScheduleTime.getInjectDate().toString() : "N/A",
                vaccineScheduleTime.getStart() + " - " + vaccineScheduleTime.getEnd(),
                "iVaccine");
        mailService.sendEmail(user.getEmail(), "[iVaccine] Xác nhận lịch tiêm - Thanh toán VNPay", _htmlVnp, false, true);
        return result;
    }

    public CustomerSchedule createMomo(CustomerSchedule customerSchedule,String orderId,String requestId) {
        LogUtils.init();
        if (paymentRepository.findByOrderIdAndRequestId(orderId, requestId).isPresent()) {
            throw new MessageException("Không được thực hiện hành động này");
        }
        Environment environment = Environment.selectEnv("dev");
        try {
            QueryStatusTransactionResponse queryStatusTransactionResponse = QueryTransactionStatus.process(environment, orderId, requestId);
            System.out.println("qqqq-----------------------------------------------------------" + queryStatusTransactionResponse.getMessage());
            if (queryStatusTransactionResponse.getResultCode() != 0) {
                throw new MessageException("Chưa được thanh toán");
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new MessageException("Chưa được thanh toán");
        }
        CustomerSchedule result = save(customerSchedule, PayType.MOMO, orderId);
        User user = userUtils.getUserWithAuthority();
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(customerSchedule.getVaccineScheduleTime().getId()).get();
        String _htmlMomo = EmailTemplateUtils.bookingConfirmation(
                customerSchedule.getFullName() != null ? customerSchedule.getFullName() : user.getEmail(),
                vaccineScheduleTime.getVaccineSchedule().getVaccine().getName(),
                vaccineScheduleTime.getInjectDate() != null ? vaccineScheduleTime.getInjectDate().toString() : "N/A",
                vaccineScheduleTime.getStart() + " - " + vaccineScheduleTime.getEnd(),
                "iVaccine");
        mailService.sendEmail(user.getEmail(), "[iVaccine] Xác nhận lịch tiêm - Thanh toán Momo", _htmlMomo, false, true);
        return result;
    }

    public CustomerSchedule save(CustomerSchedule customerSchedule, PayType payType, String orderId){
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(customerSchedule.getVaccineScheduleTime().getId()).get();

        // --- Kiểm tra cá nhân hóa: số mũi và khoảng cách tối thiểu ---
        Long vaccineId = vaccineScheduleTime.getVaccineSchedule().getVaccine().getId();
        com.web.dto.VaccinePersonalizationResponse personalization =
                vaccinePersonalizationService.checkPersonalization(vaccineId);
        if (!personalization.isCanBook()) {
            // Từ chối đặt lịch và trả về lý do cụ thể
            throw new MessageException(personalization.getReason());
        }

        // --- Kiểm tra slot còn chỗ ---
        Long count = customerScheduleRepository.countBySchedule(vaccineScheduleTime.getId());
        if (count == null){
            count = 0L;
        }
        if(count + 1 > vaccineScheduleTime.getLimitPeople()){
            throw new MessageException("Ca tiêm này đã đủ");
        }
        User user = userUtils.getUserWithAuthority();
        customerSchedule.setUser(user);
        customerSchedule.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        customerSchedule.setStatusCustomerSchedule(StatusCustomerSchedule.pending);
        customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.CHUA_THANH_TOAN);
        customerSchedule.setPayStatus(PayStatus.CHUA_THANH_TOAN);
        if(payType != null){
            if(payType.equals(PayType.VNPAY)){
                customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_VNPAY);
                customerSchedule.setPayStatus(PayStatus.DA_THANH_TOAN);
            }
            if(payType.equals(PayType.MOMO)){
                customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_MOMO);
                customerSchedule.setPayStatus(PayStatus.DA_THANH_TOAN);
            }
        }
        customerScheduleRepository.save(customerSchedule);

        if(payType != null){
            Payment payment = new Payment();
            payment.setCreatedDate(new Timestamp(System.currentTimeMillis()));
            payment.setCreatedBy(user);
            payment.setCustomerSchedule(customerSchedule);
            payment.setPayType(payType);
            payment.setOrderId(orderId);
            payment.setRequestId(orderId);
            payment.setAmount(vaccineScheduleTime.getVaccineSchedule().getVaccine().getPrice());
            paymentRepository.save(payment);
        }
        return customerSchedule;
    }

    public void finishPayment(Long id, PaymentRequest paymentRequest) {
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(id).get();

        String orderId = null;
        if(paymentRequest.getPayType().equals(PayType.MOMO)){
            LogUtils.init();
            orderId = paymentRequest.getOrderId();
            Environment environment = Environment.selectEnv("dev");
            try {
                QueryStatusTransactionResponse queryStatusTransactionResponse = QueryTransactionStatus.process(environment, orderId, paymentRequest.getRequestId());
                if (queryStatusTransactionResponse.getResultCode() != 0) {
                    throw new MessageException("Chưa được thanh toán");
                }
            } catch (Exception e) {
                e.printStackTrace();
                throw new MessageException("Chưa được thanh toán");
            }
        }
        if(paymentRequest.getPayType().equals(PayType.VNPAY)){
            orderId = paymentRequest.getVnpOrderInfo();
            int paymentStatus = vnPayService.orderReturnByUrl(paymentRequest.getVnpayUrl());
            if(paymentStatus != 1){
                throw new MessageException("Thanh toán thất bại");
            }
        }
        if(paymentRepository.findByOrderIdAndRequestId(orderId,orderId).isPresent()){
            throw new MessageException("Không hợp lệ");
        }
        CustomerSchedule customerSchedule = new CustomerSchedule();
        customerSchedule.setVaccineScheduleTime(vaccineScheduleTime);
        customerSchedule.setAddress(paymentRequest.getAddress());
        customerSchedule.setDob(paymentRequest.getDob());
        customerSchedule.setFullName(paymentRequest.getFullName());
        customerSchedule.setPhone(paymentRequest.getPhone());
        save(customerSchedule, paymentRequest.getPayType(), orderId);
    }

     public void finishPaymentSchedule(Long id, PaymentRequest paymentRequest) {
        CustomerSchedule customerSchedule = customerScheduleRepository.findById(id).get();
        if(!customerSchedule.getCustomerSchedulePay().equals(CustomerSchedulePay.CHUA_THANH_TOAN)){
            throw new MessageException("Lịch này đã được thanh toán");
        }
        String orderId = null;
        if(paymentRequest.getPayType().equals(PayType.MOMO)){
            LogUtils.init();
            orderId = paymentRequest.getOrderId();
            Environment environment = Environment.selectEnv("dev");
            try {
                QueryStatusTransactionResponse queryStatusTransactionResponse = QueryTransactionStatus.process(environment, orderId, paymentRequest.getRequestId());
                if (queryStatusTransactionResponse.getResultCode() != 0) {
                    throw new MessageException("Chưa được thanh toán");
                }
            } catch (Exception e) {
                e.printStackTrace();
                throw new MessageException("Chưa được thanh toán");
            }
            customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_MOMO);
        }
        if(paymentRequest.getPayType().equals(PayType.VNPAY)){
            orderId = paymentRequest.getVnpOrderInfo();
            int paymentStatus = vnPayService.orderReturnByUrl(paymentRequest.getVnpayUrl());
            if(paymentStatus != 1){
                throw new MessageException("Thanh toán thất bại");
            }
            customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_VNPAY);
        }
        if(paymentRepository.findByOrderIdAndRequestId(orderId,orderId).isPresent()){
            throw new MessageException("Không hợp lệ");
        }
        customerScheduleRepository.save(customerSchedule);
    }


    public void change(Long id, Long timeId) {
        CustomerSchedule customerSchedule = customerScheduleRepository.findById(id).get();
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(timeId).get();

        // kiểm tra customerSchedule đã đăng ký sau 24 giờ chưa
        Instant createdDate = customerSchedule.getCreatedDate().toInstant();
        Instant now = Instant.now();

        if (Duration.between(createdDate, now).toHours() > 24) {
            throw new MessageException("Đã quá "+Duration.between(createdDate, now).toHours()+"h, không thể đổi được lịch tiêm");
        }

        customerSchedule.setVaccineScheduleTime(vaccineScheduleTime);
        if(customerSchedule.getCounterChange() == null){
            customerSchedule.setCounterChange(0);
        }
        customerSchedule.setCounterChange(customerSchedule.getCounterChange() + 1);
        if(customerSchedule.getCounterChange() == 4){
            throw new MessageException("Bạn chỉ được đổi lịch tiêm 3 lần");
        }
        else{
            User csUser = customerSchedule.getUser();
            String _htmlChg = EmailTemplateUtils.scheduleChange(
                    customerSchedule.getFullName() != null ? customerSchedule.getFullName() : csUser.getEmail(),
                    customerSchedule.getVaccineScheduleTime().getVaccineSchedule().getVaccine().getName(),
                    vaccineScheduleTime.getInjectDate() != null ? vaccineScheduleTime.getInjectDate().toString() : "N/A",
                    vaccineScheduleTime.getStart() + " - " + vaccineScheduleTime.getEnd(),
                    3 - customerSchedule.getCounterChange());
            mailService.sendEmail(csUser.getEmail(), "[iVaccine] Thay đổi lịch hẹn tiêm chủng", _htmlChg, false, true);
        }
        customerScheduleRepository.save(customerSchedule);
    }

    public CustomerSchedule updateCustomerSchedule(UpdateCustomerSchedule request) {
        // Kiểm tra ID
        if (request.getId() == null) {
            throw new IllegalArgumentException("ID không được phép null");
        }

        // Kiểm tra bản ghi có tồn tại
        CustomerSchedule customerSchedule = customerScheduleRepository.findById(request.getId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lịch trình"));

        // Cập nhật từng trường
        if (request.getHealthStatusAfter() != null) {
            customerSchedule.setHealthStatusAfter(request.getHealthStatusAfter());
        }
        if (request.getHealthStatusBefore() != null) {
            customerSchedule.setHealthStatusBefore(request.getHealthStatusBefore());
        }

        // Kiểm tra trạng thái
        if (request.getStatus() != null) {
            customerSchedule.setStatusCustomerSchedule(
                    StatusCustomerSchedule.getStatusCustomerSchedule(request.getStatus())
            );
        }

        // Lưu và trả về
        return customerScheduleRepository.save(customerSchedule);
    }

    // -------------------- PHÂN CÔNG BÁC SĨ / Y TÁ --------------------

    public void assignDoctorNurse(AssignDoctorNurseRequest request) {
        CustomerSchedule schedule = customerScheduleRepository.findById(request.getCustomerScheduleId())
                .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy lịch đăng ký"));

        if (request.getDoctorId() != null) {
            Doctor doctor = doctorRepository.findById(request.getDoctorId())
                    .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy bác sĩ"));
            schedule.setDoctor(doctor);
        }

        if (request.getNurseId() != null) {
            Nurse nurse = nurseRepository.findById(request.getNurseId())
                    .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy y tá"));
            schedule.setNurse(nurse);
        }

        customerScheduleRepository.save(schedule);
    }

    // -------------------- DANH SÁCH BỆNH NHÂN THEO BÁC SĨ --------------------

    public Page<ListCustomerScheduleResponse> listCustomerScheduleForDoctor(ListCustomerScheduleRequest request) {
        User currentUser = userUtils.getUserWithAuthority();
        Doctor doctor = doctorRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy thông tin bác sĩ"));

        Pageable pageable = PageRequest.of(request.getPage() - 1, request.getLimit(), Sort.by(Sort.Direction.DESC, "createdDate"));
        Page<CustomerSchedule> page = customerScheduleRepository.findByDoctor_Id(doctor.getId(), pageable);
        return page.map(e -> toResponseDto(e));
    }

    // -------------------- DANH SÁCH BỆNH NHÂN THEO Y TÁ --------------------

    public Page<ListCustomerScheduleResponse> listCustomerScheduleForNurse(ListCustomerScheduleRequest request) {
        User currentUser = userUtils.getUserWithAuthority();
        Nurse nurse = nurseRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy thông tin y tá"));

        Pageable pageable = PageRequest.of(request.getPage() - 1, request.getLimit(), Sort.by(Sort.Direction.DESC, "createdDate"));
        Page<CustomerSchedule> page = customerScheduleRepository.findByNurse_Id(nurse.getId(), pageable);
        return page.map(e -> toResponseDto(e));
    }

    // -------------------- HELPER: map entity -> DTO --------------------

    private ListCustomerScheduleResponse toResponseDto(CustomerSchedule e) {
        Optional<User> user = userRepository.findById(e.getUser().getId());
        Optional<VaccineScheduleTime> vaccineScheduleTime = vaccineScheduleTimeRepository.findById(e.getVaccineScheduleTime().getId());
        return ListCustomerScheduleResponse.builder()
                .id(e.getId())
                .status(e.getStatusCustomerSchedule().name())
                .fullName(e.getFullName())
                .createdDate(e.getCreatedDate())
                .vaccineScheduleTime(vaccineScheduleTime.orElse(null))
                .user(user.orElse(null))
                .note(e.getNote())
                .payStatus(e.getCustomerSchedulePay() != null &&
                        (e.getCustomerSchedulePay() == CustomerSchedulePay.THANH_TOAN_MOMO ||
                                e.getCustomerSchedulePay() == CustomerSchedulePay.THANH_TOAN_VNPAY))
                .healthStatusAfter(e.getHealthStatusAfter())
                .healthStatusBefore(e.getHealthStatusBefore())
                .completedDate(e.getCompletedDate())
                .doctor(e.getDoctor())
                .nurse(e.getNurse())
                .build();
    }
}

