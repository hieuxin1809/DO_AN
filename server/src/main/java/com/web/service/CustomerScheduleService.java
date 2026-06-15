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
/**
 * Service xử lý nghiệp vụ liên quan đến lịch hẹn tiêm của khách hàng (CustomerSchedule).
 * 
 * Các luồng nghiệp vụ chính:
 * - Đăng ký đặt lịch tiêm (trực tiếp, online qua MoMo, VNPay, PayPal, hoặc khách vãng lai).
 * - Cơ chế giữ chỗ tạm thời (Reservation) trong 15 phút chống đặt trùng/quá tải.
 * - Duyệt/Hủy lịch hẹn từ Admin và tự động gửi thông báo Email + cấp giấy chứng nhận.
 * - Đổi ca tiêm (Change slot) thỏa mãn quy tắc giới hạn số lần và thời gian tối thiểu.
 * - Quét tự động (Cron Job) giải phóng chỗ giữ quá hạn và cập nhật các lịch trễ hẹn.
 * - Phân công bác sĩ, y tá phụ trách cho từng lịch tiêm.
 */
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
    private PayPalService payPalService;

    @Autowired
    private MailService mailService;

    @Autowired
    private VaccinationCertificateService vaccinationCertificateService;

    @Autowired
    private VaccinePersonalizationService vaccinePersonalizationService;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private NurseRepository nurseRepository;

    @Autowired
    private ScheduleChangeHistoryRepository scheduleChangeHistoryRepository;

    /** Số lần đổi lịch tối đa cho 1 customer schedule */
    private static final int MAX_CHANGE_TIMES = 3;
    
    /** Phải đổi lịch trước ngày tiêm ít nhất X giờ */
    private static final int MIN_HOURS_BEFORE_INJECT = 24;
    
    /** Slot giữ chỗ tối đa X phút trước khi auto-release */
    public static final int HOLD_MINUTES = 15;

    /**
     * Tạo lịch hẹn tiêm (Thanh toán qua Momo ngay lúc đặt).
     */
    public CustomerSchedule create(CustomerSchedule customerSchedule, String orderId, String requestId) {
        LogUtils.init();
        // Bước 1: Kiểm tra xem giao dịch MoMo này đã từng được ghi nhận trong DB chưa (tránh fake payment/thanh toán trùng)
        if (paymentRepository.findByOrderIdAndRequestId(orderId, requestId).isPresent()) {
            throw new MessageException("Không được thực hiện hành động này");
        }
        
        // Bước 2: Gọi cổng thanh toán MoMo để đối soát và kiểm tra trạng thái thực tế của giao dịch
        Environment environment = Environment.selectEnv("dev");
        try {
            QueryStatusTransactionResponse queryStatusTransactionResponse = QueryTransactionStatus.process(environment, orderId, requestId);
            System.out.println("qqqq-----------------------------------------------------------" + queryStatusTransactionResponse.getMessage());
            // Nếu mã kết quả giao dịch khác 0, nghĩa là thanh toán chưa thành công ở phía MoMo
            if (queryStatusTransactionResponse.getResultCode() != 0) {
                throw new MessageException("Chưa được thanh toán");
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new MessageException("Chưa được thanh toán");
        }
        
        // Bước 3: Lấy thông tin user hiện tại đang đăng nhập để gán vào lịch hẹn
        User user = userUtils.getUserWithAuthority();
        customerSchedule.setUser(user);
        customerSchedule.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        // Trạng thái mặc định ban đầu là pending (Chờ duyệt)
        customerSchedule.setStatusCustomerSchedule(StatusCustomerSchedule.pending);
        
        // Bước 4: Lưu thông tin lịch hẹn của khách hàng
        customerScheduleRepository.save(customerSchedule);

        // Bước 5: Tạo bản ghi trong bảng Payment để lưu vết đối soát giao dịch
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

    /**
     * Lấy lịch sử đặt lịch tiêm của tài khoản hiện tại.
     * Hỗ trợ tìm kiếm từ khóa gần đúng và lọc theo khoảng thời gian tiêm (from - to).
     */
    public Page<CustomerSchedule> mySchedule(Pageable pageable, String search, Date from, Date to) {
        // Bước 1: Lấy tài khoản đang đăng nhập
        User user = userUtils.getUserWithAuthority();
        
        // Bước 2: Chuẩn hóa tham số tìm kiếm
        if (search == null) {
            search = "";
        }
        search = "%" + search + "%";
        
        // Bước 3: Nếu mốc thời gian lọc trống, gán mặc định để bao phủ khoảng rộng nhất (năm 2000 đến 2100)
        if (from == null || to == null) {
            from = Date.valueOf("2000-01-01");
            to = Date.valueOf("2100-01-01");
        }
        
        // Bước 4: Truy vấn cơ sở dữ liệu và trả về kết quả phân trang
        return customerScheduleRepository.findByUser(user.getId(), search, from, to, pageable);
    }

    /**
     * Khách hàng chủ động hủy lịch hẹn tiêm của mình.
     */
    public void cancel(Long id) {
        // Bước 1: Tìm kiếm lịch hẹn cần hủy theo ID
        Optional<CustomerSchedule> customerSchedule = customerScheduleRepository.findById(id);
        if (customerSchedule.isEmpty()) {
            throw new MessageException("Không tìm thấy lịch đã đăng ký");
        }
        
        // Bước 2: Kiểm tra quyền sở hữu (Chỉ tài khoản đặt lịch đó mới được quyền hủy)
        if (customerSchedule.get().getUser().getId() != userUtils.getUserWithAuthority().getId()) {
            throw new MessageException("Bạn không đủ quyền");
        }
        
        // Bước 3: Không cho phép thực hiện lại nếu lịch hẹn đã bị hủy từ trước
        if (customerSchedule.get().getStatusCustomerSchedule().equals(StatusCustomerSchedule.cancelled)) {
            throw new MessageException("Không được lặp lại hành động");
        }
        
        // Bước 4: Đổi trạng thái lịch thành 'cancelled' (Đã hủy) và lưu vào database
        customerSchedule.get().setStatusCustomerSchedule(StatusCustomerSchedule.cancelled);
        customerScheduleRepository.save(customerSchedule.get());
    }

    /**
     * Lấy danh sách lịch tiêm của tất cả khách hàng (Dùng cho Admin/Nhân viên quản lý).
     * Phân trang và lọc động dựa trên bộ lọc truyền vào.
     */
    public Page<ListCustomerScheduleResponse> listCustomerSchedule(ListCustomerScheduleRequest request) {
        if (ObjectUtils.isEmpty(request)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }

        // Bước 1: Thiết lập đối tượng phân trang (sắp xếp giảm dần theo ngày tạo)
        Pageable pageable = PageRequest.of(request.getPage() - 1, request.getLimit(), Sort.by(Sort.Direction.DESC, "createdDate"));
        
        // Bước 2: Truy vấn dữ liệu thực thể từ DB theo Specification lọc động
        Page<CustomerSchedule> customerSchedulePage = customerScheduleRepository.findAll(specificationCustomerScheduleList(request), pageable);

        // Bước 3: Ánh xạ danh sách thực thể sang DTO Response để trả về Client
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
                            // Xác định trạng thái thanh toán
                            .payStatus(e.getPayStatus() == PayStatus.DA_THANH_TOAN)
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

    /**
     * Xây dựng điều kiện lọc động Specification cho danh sách CustomerSchedule.
     */
    public Specification<CustomerSchedule> specificationCustomerScheduleList(ListCustomerScheduleRequest requestBody) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Lọc theo họ tên khách hàng gần đúng (LIKE)
            if (StringUtils.isNotEmpty(requestBody.getFullName())) {
                String searchValue = "%" + requestBody.getFullName() + "%";
                predicates.add(criteriaBuilder.like(root.get("fullName"), searchValue));
            }
            
            // Lọc theo trạng thái lịch hẹn
            if (ObjectUtils.isNotEmpty(requestBody.getStatus())) {
                predicates.add(criteriaBuilder.and(criteriaBuilder.equal(root.get("statusCustomerSchedule"), StatusCustomerSchedule.valueOf(requestBody.getStatus()))));
            }

            // Lọc theo mã lịch tiêm (vaccineScheduleId)
            if (ObjectUtils.isNotEmpty(requestBody.getVaccineScheduleId())) {
                predicates.add(criteriaBuilder.equal(root.get("vaccineScheduleTime").get("vaccineSchedule").get("id"), requestBody.getVaccineScheduleId()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Đăng ký tiêm cho Khách Vãng Lai (Chưa có tài khoản trên hệ thống).
     * Hệ thống sẽ tự động tạo tài khoản và gửi thông tin đăng nhập + chi tiết lịch tiêm về email.
     */
    @Transactional(rollbackFor = Exception.class)
    public CreateScheduleGuestResponse createScheduleGuest(CreateScheduleGuestRequest request) {
        if (ObjectUtils.isEmpty(request)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Thông tin đăng ký không hợp lệ");
        }

        // Bước 1: Tìm tài khoản email xem đã tồn tại trong DB chưa
        Optional<User> optionalUser = userRepository.findByEmail(request.getEmail());
        User user;
        boolean isNewUser = false;
        String generatedPassword = null;
        
        if (optionalUser.isPresent()) {
            // Nếu đã tồn tại, liên kết lịch hẹn với tài khoản email này
            user = optionalUser.get();
        } else {
            // Nếu chưa tồn tại email, kiểm tra số điện thoại có bị trùng không
            Optional<User> optionalUserPhone = userRepository.findByPhoneNumber(request.getPhone());
            if (optionalUserPhone.isPresent()) {
                throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Số điện thoại đã được sử dụng");
            }

            isNewUser = true;
            // Tự động sinh mật khẩu ngẫu nhiên 12 ký tự cho tài khoản mới
            generatedPassword = generateRandomPassword();
            String encodedPassword = passwordEncoder.encode(generatedPassword);

            // Tạo và lưu thông tin User mới (mặc định quyền Khách Hàng - Authority ID 4)
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

        // Bước 2: Xác định khung giờ tiêm (VaccineScheduleTime)
        VaccineScheduleTime vaccineScheduleTime;
        if (request.getVaccineScheduleTimeId() != null) {
            // Lấy theo ID khung giờ cụ thể do Client gửi lên
            vaccineScheduleTime = vaccineScheduleTimeRepository.findById(request.getVaccineScheduleTimeId())
                    .orElseThrow(() -> new MessageException(HttpStatus.BAD_REQUEST.value(), "Giờ tiêm không tồn tại"));
        } else {
            // Tự động tìm khung giờ còn trống chỗ bất kỳ thuộc lịch tiêm đó
            vaccineScheduleTime = findAvailableVaccineScheduleTime(request.getVaccineScheduleId());
        }

        // Bước 3: Tạo đối tượng lịch hẹn tiêm ở trạng thái pending (Chờ duyệt) và chưa thanh toán
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

        // Bước 4: Gửi email thông báo lịch tiêm và tài khoản mới (nếu có)
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

    /**
     * Phê duyệt hoặc cập nhật trạng thái lịch tiêm của Khách Hàng (Dành cho Admin/Nhân viên y tế).
     * 
     * @param request Chứa ID lịch hẹn và trạng thái cần chuyển (confirmed, cancelled, injected, finished, not_injected).
     */
    public ApproveCustomerScheduleResponse approveCustomerSchedule(ApproveCustomerScheduleRequest request) {
        if (ObjectUtils.isEmpty(request)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Đã có lỗi");
        }
        
        // Bước 1: Tìm kiếm lịch hẹn cần duyệt
        Optional<CustomerSchedule> optionalVaccineSchedule = customerScheduleRepository.findById(request.getCustomerScheduleId());
        if (ObjectUtils.isEmpty(optionalVaccineSchedule)) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Lịch tiêm của khách không tồn tại");
        }
        CustomerSchedule customerSchedule = optionalVaccineSchedule.get();
        
        // Bước 2: Chuyển chuỗi trạng thái nhận được từ client sang Enum tương ứng
        StatusCustomerSchedule newStatus;
        switch (request.getStatus()) {
            case "confirmed":     newStatus = StatusCustomerSchedule.confirmed;     break;
            case "cancelled":     newStatus = StatusCustomerSchedule.cancelled;     break;
            case "injected":      newStatus = StatusCustomerSchedule.injected;      break;
            case "finished":      newStatus = StatusCustomerSchedule.finished;      break;
            case "not_injected":  newStatus = StatusCustomerSchedule.not_injected;  break;
            default: throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Trạng thái không hợp lệ: " + request.getStatus());
        }
        
        // Thiết lập trạng thái mới cho lịch hẹn
        customerSchedule.setStatusCustomerSchedule(newStatus);
        
        // Bước 3: Nếu chuyển sang trạng thái kết thúc/hủy/chưa tiêm/đã tiêm thì gán mốc thời gian hoàn thành (completedDate)
        if (newStatus == StatusCustomerSchedule.injected
                || newStatus == StatusCustomerSchedule.cancelled
                || newStatus == StatusCustomerSchedule.finished
                || newStatus == StatusCustomerSchedule.not_injected) {
            customerSchedule.setCompletedDate(new Timestamp(System.currentTimeMillis()));
        }
        customerScheduleRepository.save(customerSchedule);
        
        // Bước 4: Gửi Email thông báo trạng thái cập nhật tới Khách hàng
        sendEmailToCustomer(customerSchedule);

        /* ─── Bước 5: Auto cấp giấy xác nhận tiêm chủng khi đã tiêm (injected/finished) ─── */
        if (newStatus == StatusCustomerSchedule.injected
                || newStatus == StatusCustomerSchedule.finished) {
            try {
                // Tạo chứng nhận tiêm chủng dựa trên thông tin lịch tiêm
                VaccinationCertificate cert = vaccinationCertificateService.generateAfterInjection(customerSchedule.getId());
                // Gửi email kèm mã QR/chứng nhận về cho khách hàng
                vaccinationCertificateService.sendCertificateEmail(cert);
            } catch (Exception ex) {
                // Chỉ in log lỗi chứ không rollback giao dịch phê duyệt lịch chính
                System.err.println("[Cert] Không tạo được giấy xác nhận: " + ex.getMessage());
            }
        }

        return ApproveCustomerScheduleResponse.builder().status(request.getStatus()).build();
    }

    /**
     * Gửi Email cập nhật trạng thái lịch tiêm đến cho Khách hàng.
     */
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
        // Sử dụng helper EmailTemplateUtils để render HTML nội dung email
        String html = EmailTemplateUtils.bookingStatusUpdate(customerName, vaccineName, status);
        mailService.sendEmail(to, subject, html, false, true);
    }

    /**
     * Hàm helper tạo nhanh VaccineScheduleTime.
     */
    private VaccineScheduleTime createVaccineScheduleTime(VaccineSchedule vaccineSchedule, String startTime, String endTime) {
        VaccineScheduleTime scheduleTime = new VaccineScheduleTime();
        scheduleTime.setInjectDate(new Date(System.currentTimeMillis()));
        scheduleTime.setStart(Time.valueOf(startTime));
        scheduleTime.setEnd(Time.valueOf(endTime));
        scheduleTime.setLimitPeople(100);
        scheduleTime.setVaccineSchedule(vaccineSchedule);
        return vaccineScheduleTimeRepository.save(scheduleTime);
    }

    /**
     * Gửi email thông báo tài khoản & lịch tiêm vãng lai được khởi tạo.
     */
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

    /**
     * Sinh mật khẩu ngẫu nhiên dài 12 ký tự bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
     */
    private String generateRandomPassword() {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
        StringBuilder password = new StringBuilder();
        SecureRandom random = new SecureRandom();

        for (int i = 0; i < 12; i++) {
            password.append(characters.charAt(random.nextInt(characters.length())));
        }

        return password.toString();
    }

    /**
     * Tìm kiếm khung giờ còn trống vị trí bất kỳ (chưa vượt quá giới hạn limitPeople) trong lịch tiêm.
     */
    private VaccineScheduleTime findAvailableVaccineScheduleTime(Long vaccineScheduleId) {
        // Lấy tất cả các khung giờ (slot) trong lịch tiêm
        List<VaccineScheduleTime> availableSlots = vaccineScheduleTimeRepository.findAllByVaccineScheduleId(vaccineScheduleId);

        if (availableSlots == null || availableSlots.isEmpty()) {
            throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Lịch tiêm này chưa cập nhập slot.");
        }

        // Duyệt qua từng khung giờ để tìm slot còn chỗ
        for (VaccineScheduleTime slot : availableSlots) {
            // Đếm số lượng đăng ký thực tế của slot hiện tại
            Long currentRegistrations = customerScheduleRepository.countByVaccineScheduleTimeId(slot.getId());
            if (currentRegistrations < slot.getLimitPeople()) {
                return slot; // Trả về khung giờ đầu tiên tìm thấy còn chỗ trống
            }
        }

        throw new MessageException(HttpStatus.BAD_REQUEST.value(), "Tất cả các slot trong lịch tiêm đã hết chỗ.");
    }

    /**
     * Tạo lịch đặt tiêm không thanh toán trước (Thanh toán sau tại quầy).
     * Gửi email nhắc nhở hoàn tất thủ tục thanh toán trong vòng 24 giờ.
     */
    public CustomerSchedule createNotPay(CustomerSchedule customerSchedule) {
        User user = userUtils.getUserWithAuthority();
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(customerSchedule.getVaccineScheduleTime().getId()).get();
        // Gọi hàm lưu chính
        CustomerSchedule result = save(customerSchedule, null, null);
        
        // Gửi email xác nhận đặt lịch (Thanh toán sau tại trung tâm)
        String _html1 = EmailTemplateUtils.bookingConfirmationPayLater(
                customerSchedule.getFullName() != null ? customerSchedule.getFullName() : user.getEmail(), 
                vaccineScheduleTime.getVaccineSchedule().getVaccine().getName(), 
                vaccineScheduleTime.getInjectDate() != null ? vaccineScheduleTime.getInjectDate().toString() : "N/A",
                vaccineScheduleTime.getStart() + " - " + vaccineScheduleTime.getEnd(),
                vaccineScheduleTime.getVaccineSchedule().getCenter().getCenterName() != null 
                        ? vaccineScheduleTime.getVaccineSchedule().getCenter().getCenterName() : "iVaccine"
        );
        mailService.sendEmail(user.getEmail(), "[iVaccine] Xác nhận lịch tiêm - Thanh toán tại trung tâm", _html1, false, true);
        
        return result;
    }

    /**
     * Nghiệp vụ Giữ Chỗ (Reserve Slot): Tạo CustomerSchedule tạm thời với trạng thái pending_payment.
     * Slot này được giữ (hold) cho user trong 15 phút. Quá 15 phút chưa pay, hệ thống sẽ tự động hủy.
     */
    @Transactional
    public CustomerSchedule createReservation(CustomerSchedule customerSchedule) {
        User user = userUtils.getUserWithAuthority();
        if (user == null) throw new MessageException("Vui lòng đăng nhập!");
        if (customerSchedule.getVaccineScheduleTime() == null
                || customerSchedule.getVaccineScheduleTime().getId() == null) {
            throw new MessageException("Thiếu khung giờ tiêm");
        }
        
        // Bước 1: Tìm kiếm khung giờ tiêm
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository
                .findById(customerSchedule.getVaccineScheduleTime().getId())
                .orElseThrow(() -> new MessageException("Khung giờ không tồn tại"));

        /* ─── Bước 2: Kiểm tra cá nhân hóa ─── */
        // Chỉ áp dụng kiểm tra khi tự đặt lịch cho bản thân (không đặt cho người thân)
        boolean forOther = Boolean.TRUE.equals(customerSchedule.getBookingForOther());
        if (!forOther) {
            Long vaccineId = vaccineScheduleTime.getVaccineSchedule().getVaccine().getId();
            // Gọi service phân tích y khoa để xem user có đủ điều kiện tiêm vaccine này tiếp theo hay không
            com.web.dto.VaccinePersonalizationResponse p = vaccinePersonalizationService.checkPersonalization(vaccineId);
            if (!p.isCanBook()) throw new MessageException(p.getReason());
        }

        /* ─── Bước 3: Kiểm tra giới hạn chỗ (capacity) ─── */
        // Đếm số đơn đã đặt ca này (bao gồm cả các đơn pending_payment chưa thanh toán)
        long count = customerScheduleRepository.countByVaccineScheduleTimeId(vaccineScheduleTime.getId());
        int limit = vaccineScheduleTime.getLimitPeople() == null ? 0 : vaccineScheduleTime.getLimitPeople();
        if (count + 1 > limit) {
            throw new MessageException("Ca tiêm này đã đủ chỗ — vui lòng chọn khung giờ khác");
        }

        // Bước 4: Thiết lập thông tin và lưu tạm trạng thái 'pending_payment'
        customerSchedule.setUser(user);
        customerSchedule.setVaccineScheduleTime(vaccineScheduleTime);
        customerSchedule.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        customerSchedule.setStatusCustomerSchedule(StatusCustomerSchedule.pending_payment);
        customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.CHUA_THANH_TOAN);
        customerSchedule.setPayStatus(PayStatus.CHUA_THANH_TOAN);
        
        return customerScheduleRepository.save(customerSchedule);
    }

    /**
     * Hủy giữ chỗ thủ công (Khi người dùng đóng modal thanh toán hoặc bấm hủy đơn chờ).
     */
    @Transactional
    public void cancelReservation(Long customerScheduleId) {
        User user = userUtils.getUserWithAuthority();
        if (user == null) throw new MessageException("Vui lòng đăng nhập!");
        
        CustomerSchedule cs = customerScheduleRepository.findById(customerScheduleId)
                .orElseThrow(() -> new MessageException("Không tìm thấy lịch"));
        
        // Kiểm tra quyền sở hữu lịch giữ chỗ
        if (cs.getUser() == null || !cs.getUser().getId().equals(user.getId())) {
            throw new MessageException("Bạn không có quyền hủy lịch này");
        }
        
        // Chỉ cho phép hủy khi lịch đang ở trạng thái giữ chỗ tạm thời (pending_payment)
        if (cs.getStatusCustomerSchedule() != StatusCustomerSchedule.pending_payment) {
            throw new MessageException("Chỉ hủy được lịch đang giữ chỗ");
        }
        
        cs.setStatusCustomerSchedule(StatusCustomerSchedule.cancelled);
        customerScheduleRepository.save(cs);
    }

    /**
     * Cron Job ngầm: Chạy định kỳ mỗi 60 giây (1 phút).
     * Tìm tất cả các lịch hẹn ở trạng thái 'pending_payment' quá 15 phút chưa thanh toán
     * và tự động chuyển sang 'cancelled' để giải phóng slot trống cho người khác.
     */
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void releaseExpiredHolds() {
        // Xác định mốc thời gian tối đa được giữ chỗ (hiện tại - 15 phút)
        Timestamp cutoff = new Timestamp(System.currentTimeMillis() - HOLD_MINUTES * 60_000L);
        // Tìm các đơn giữ chỗ đã quá hạn
        List<CustomerSchedule> expired = customerScheduleRepository
                .findExpiredHolds(StatusCustomerSchedule.pending_payment, cutoff);
        
        // Chuyển toàn bộ sang cancelled
        for (CustomerSchedule cs : expired) {
            cs.setStatusCustomerSchedule(StatusCustomerSchedule.cancelled);
            customerScheduleRepository.save(cs);
        }
        
        if (!expired.isEmpty()) {
            System.out.println("[Hold] Tự động giải phóng " + expired.size() + " đơn giữ chỗ đã hết hạn");
        }
    }

    /**
     * Cron Job ngầm: Chạy vào phút thứ 10 mỗi giờ.
     * Quét và tự động chuyển các lịch tiêm trễ hẹn quá 24h từ ca kết thúc sang trạng thái 'not_injected'.
     */
    @Scheduled(cron = "0 10 * * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void autoUpdateMissedAppointments() {
        // Tìm các lịch hẹn ngày hôm trước có trạng thái 'confirmed' hoặc 'pending' chưa được xử lý
        java.sql.Date yesterday = java.sql.Date.valueOf(java.time.LocalDate.now().minusDays(1));
        List<CustomerSchedule> potentialMissed = customerScheduleRepository.findPotentialMissedAppointments(
                yesterday, StatusCustomerSchedule.confirmed, StatusCustomerSchedule.pending);
        
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        int count = 0;
        
        for (CustomerSchedule cs : potentialMissed) {
            if (cs.getVaccineScheduleTime() == null 
                    || cs.getVaccineScheduleTime().getInjectDate() == null
                    || cs.getVaccineScheduleTime().getEnd() == null) continue;
                    
            java.time.LocalDate injectDate = cs.getVaccineScheduleTime().getInjectDate().toLocalDate();
            java.time.LocalTime endTime = cs.getVaccineScheduleTime().getEnd().toLocalTime();
            java.time.LocalDateTime endAt = injectDate.atTime(endTime);
            
            // Nếu thời điểm hiện tại đã quá thời gian ca tiêm kết thúc (khách không đến tiêm trong ngày)
            if (now.isAfter(endAt)) {
                // Tự động chuyển trạng thái sang đã hủy (cancelled) - không tự động hoàn tiền
                cs.setStatusCustomerSchedule(StatusCustomerSchedule.cancelled);
                cs.setCompletedDate(new Timestamp(System.currentTimeMillis()));
                customerScheduleRepository.save(cs);
                count++;
                
                try {
                    // Gửi email thông báo cho khách hàng về việc lịch tiêm đã bị hủy do quá hạn không đến
                    sendEmailToCustomer(cs);
                } catch (Exception e) {
                    System.err.println("[AutoMissed] Lỗi gửi email cho cs#" + cs.getId() + ": " + e.getMessage());
                }
            }
        }
        
        if (count > 0) {
            System.out.println("[AutoMissed] Đã tự động hủy " + count + " lịch tiêm quá hạn do bệnh nhân không đến");
        }
    }

    /**
     * Lưu đặt lịch tiêm thanh toán online qua VNPay thành công.
     */
    public CustomerSchedule createVnPay(CustomerScheduleVnpay customerScheduleVnpay) {
        // Kiểm tra mã giao dịch trùng lặp
        if (paymentRepository.findByOrderIdAndRequestId(customerScheduleVnpay.getVnpOrderInfo(), customerScheduleVnpay.getVnpOrderInfo()).isPresent()) {
            throw new MessageException("Lịch đặt đã được thanh toán");
        }
        
        // Gọi service VNPay xác thực tính toàn vẹn của kết quả giao dịch
        int paymentStatus = vnPayService.orderReturnByUrl(customerScheduleVnpay.getVnpayUrl());
        if (paymentStatus != 1) {
            throw new MessageException("Thanh toán thất bại");
        }
        
        User user = userUtils.getUserWithAuthority();
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(customerScheduleVnpay.getCustomerSchedule().getVaccineScheduleTime().getId()).get();
        
        // Lưu lịch hẹn vào database với trạng thái VNPay
        CustomerSchedule result = save(customerScheduleVnpay.getCustomerSchedule(), PayType.VNPAY, customerScheduleVnpay.getVnpOrderInfo());
        
        // Gửi email thông báo xác nhận đặt lịch & thanh toán thành công
        String _htmlVnp = EmailTemplateUtils.bookingConfirmation(
                customerScheduleVnpay.getCustomerSchedule().getFullName() != null ? customerScheduleVnpay.getCustomerSchedule().getFullName() : user.getEmail(),
                vaccineScheduleTime.getVaccineSchedule().getVaccine().getName(),
                vaccineScheduleTime.getInjectDate() != null ? vaccineScheduleTime.getInjectDate().toString() : "N/A",
                vaccineScheduleTime.getStart() + " - " + vaccineScheduleTime.getEnd(),
                "iVaccine");
        mailService.sendEmail(user.getEmail(), "[iVaccine] Xác nhận lịch tiêm - Thanh toán VNPay", _htmlVnp, false, true);
        
        return result;
    }

    /**
     * Lưu đặt lịch tiêm thanh toán online qua MoMo thành công.
     */
    public CustomerSchedule createMomo(CustomerSchedule customerSchedule, String orderId, String requestId) {
        LogUtils.init();
        if (paymentRepository.findByOrderIdAndRequestId(orderId, requestId).isPresent()) {
            throw new MessageException("Không được thực hiện hành động này");
        }
        
        // Gọi đối soát giao dịch sang phía MoMo
        Environment environment = Environment.selectEnv("dev");
        try {
            QueryStatusTransactionResponse queryStatusTransactionResponse = QueryTransactionStatus.process(environment, orderId, requestId);
            if (queryStatusTransactionResponse.getResultCode() != 0) {
                throw new MessageException("Chưa được thanh toán");
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new MessageException("Chưa được thanh toán");
        }
        
        // Lưu lịch hẹn vào database với trạng thái MoMo
        CustomerSchedule result = save(customerSchedule, PayType.MOMO, orderId);
        User user = userUtils.getUserWithAuthority();
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(customerSchedule.getVaccineScheduleTime().getId()).get();
        
        // Gửi email xác nhận lịch tiêm
        String _htmlMomo = EmailTemplateUtils.bookingConfirmation(
                customerSchedule.getFullName() != null ? customerSchedule.getFullName() : user.getEmail(),
                vaccineScheduleTime.getVaccineSchedule().getVaccine().getName(),
                vaccineScheduleTime.getInjectDate() != null ? vaccineScheduleTime.getInjectDate().toString() : "N/A",
                vaccineScheduleTime.getStart() + " - " + vaccineScheduleTime.getEnd(),
                "iVaccine");
        mailService.sendEmail(user.getEmail(), "[iVaccine] Xác nhận lịch tiêm - Thanh toán Momo", _htmlMomo, false, true);
        
        return result;
    }

    /**
     * Hàm dùng chung để lưu CustomerSchedule và ghi nhận lịch sử thanh toán (Payment) tương ứng.
     */
    public CustomerSchedule save(CustomerSchedule customerSchedule, PayType payType, String orderId) {
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(customerSchedule.getVaccineScheduleTime().getId()).get();

        // ─── Kiểm tra cá nhân hóa y khoa (Chỉ áp dụng khi tự đặt lịch cho bản thân) ───
        boolean forOther = Boolean.TRUE.equals(customerSchedule.getBookingForOther());
        if (!forOther) {
            Long vaccineId = vaccineScheduleTime.getVaccineSchedule().getVaccine().getId();
            com.web.dto.VaccinePersonalizationResponse personalization =
                    vaccinePersonalizationService.checkPersonalization(vaccineId);
            if (!personalization.isCanBook()) {
                throw new MessageException(personalization.getReason());
            }
        }

        // ─── Kiểm tra giới hạn số lượng chỗ trống ca tiêm ───
        Long count = customerScheduleRepository.countBySchedule(vaccineScheduleTime.getId());
        if (count == null) {
            count = 0L;
        }
        if (count + 1 > vaccineScheduleTime.getLimitPeople()) {
            throw new MessageException("Ca tiêm này đã đủ");
        }
        
        User user = userUtils.getUserWithAuthority();
        customerSchedule.setUser(user);
        customerSchedule.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        customerSchedule.setStatusCustomerSchedule(StatusCustomerSchedule.pending); // Trạng thái mặc định: Chờ duyệt
        customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.CHUA_THANH_TOAN);
        customerSchedule.setPayStatus(PayStatus.CHUA_THANH_TOAN);
        
        // Cập nhật thông tin cổng thanh toán tương ứng
        if (payType != null) {
            if (payType.equals(PayType.VNPAY)) {
                customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_VNPAY);
                customerSchedule.setPayStatus(PayStatus.DA_THANH_TOAN);
            }
            if (payType.equals(PayType.MOMO)) {
                customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_MOMO);
                customerSchedule.setPayStatus(PayStatus.DA_THANH_TOAN);
            }
            if (payType.equals(PayType.PAYPAL)) {
                customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_PAYPAL);
                customerSchedule.setPayStatus(PayStatus.DA_THANH_TOAN);
            }
        }
        customerScheduleRepository.save(customerSchedule);

        // Tạo hóa đơn đối soát
        if (payType != null) {
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
// xử lý giao dịch phần paypal
    /**
     * Xác thực thanh toán của một lịch hẹn mới (Gọi từ callback sau khi user thanh toán thành công).
     */
    public void finishPayment(Long id, PaymentRequest paymentRequest) {
        VaccineScheduleTime vaccineScheduleTime = vaccineScheduleTimeRepository.findById(id).get();
        String orderId = null;
        
        // 1. Xác thực giao dịch
        if (paymentRequest.getPayType().equals(PayType.MOMO)) {
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
        
        // 2. Xác thực giao dịch VNPay
        if (paymentRequest.getPayType().equals(PayType.VNPAY)) {
            orderId = paymentRequest.getVnpOrderInfo();
            int paymentStatus = vnPayService.orderReturnByUrl(paymentRequest.getVnpayUrl());
            if (paymentStatus != 1) {
                throw new MessageException("Thanh toán thất bại");
            }
        }
        
        // 3. Xác thực giao dịch PayPal
        if (paymentRequest.getPayType().equals(PayType.PAYPAL)) {
            orderId = paymentRequest.getOrderId();
            payPalService.verifyOrder(orderId); // Xác thực trực tiếp với PayPal API để tránh fake orderId
        }
        
        // Kiểm tra chống tạo trùng
        if (paymentRepository.findByOrderIdAndRequestId(orderId, orderId).isPresent()) {
            throw new MessageException("Không hợp lệ");
        }
        
        CustomerSchedule customerSchedule = new CustomerSchedule();
        customerSchedule.setVaccineScheduleTime(vaccineScheduleTime);
        customerSchedule.setAddress(paymentRequest.getAddress());
        customerSchedule.setDob(paymentRequest.getDob());
        customerSchedule.setFullName(paymentRequest.getFullName());
        customerSchedule.setPhone(paymentRequest.getPhone());
        customerSchedule.setBookingForOther(Boolean.TRUE.equals(paymentRequest.getBookingForOther()));
        
        save(customerSchedule, paymentRequest.getPayType(), orderId);
    }

    /**
     * Hoàn tất thanh toán cho lịch tiêm giữ chỗ tạm thời (Reservation).
     * Nếu đã quá 15 phút giữ chỗ sẽ báo lỗi để yêu cầu chọn lại.
     */
    public void finishPaymentSchedule(Long id, PaymentRequest paymentRequest) {
        CustomerSchedule customerSchedule = customerScheduleRepository.findById(id).get();
        
        // Kiểm tra trạng thái thanh toán cũ
        if (!customerSchedule.getCustomerSchedulePay().equals(CustomerSchedulePay.CHUA_THANH_TOAN)) {
            throw new MessageException("Lịch này đã được thanh toán");
        }

        /* ─── Kiểm tra thời hạn 15 phút giữ chỗ ─── */
        if (customerSchedule.getStatusCustomerSchedule() == StatusCustomerSchedule.pending_payment) {
            long expiresAt = customerSchedule.getCreatedDate().getTime() + HOLD_MINUTES * 60_000L;
            if (System.currentTimeMillis() > expiresAt) {
                // Quá hạn -> chuyển trạng thái thành cancelled
                customerSchedule.setStatusCustomerSchedule(StatusCustomerSchedule.cancelled);
                customerScheduleRepository.save(customerSchedule);
                throw new MessageException("Đã quá thời gian giữ chỗ (15 phút). Vui lòng đặt lại.");
            }
        }
        
        String orderId = null;
        
        if (paymentRequest.getPayType().equals(PayType.MOMO)) {
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
        
        // 2. Xác thực thanh toán VNPay
        if (paymentRequest.getPayType().equals(PayType.VNPAY)) {
            orderId = paymentRequest.getVnpOrderInfo();
            int paymentStatus = vnPayService.orderReturnByUrl(paymentRequest.getVnpayUrl());
            if (paymentStatus != 1) {
                throw new MessageException("Thanh toán thất bại");
            }
            customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_VNPAY);
        }
        
        // 3. Xác thực thanh toán PayPal
        if (paymentRequest.getPayType().equals(PayType.PAYPAL)) {
            orderId = paymentRequest.getOrderId();
            payPalService.verifyOrder(orderId);
            customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_PAYPAL);
        }
        
        // Chống thanh toán trùng lặp mã giao dịch
        if (paymentRepository.findByOrderIdAndRequestId(orderId, orderId).isPresent()) {
            throw new MessageException("Không hợp lệ");
        }
        
        customerSchedule.setPayStatus(PayStatus.DA_THANH_TOAN);
        
        // Chuyển từ trạng thái giữ chỗ sang 'pending' (Chờ duyệt) để quản trị viên kiểm tra
        if (customerSchedule.getStatusCustomerSchedule() == StatusCustomerSchedule.pending_payment) {
            customerSchedule.setStatusCustomerSchedule(StatusCustomerSchedule.pending);
        }
        customerScheduleRepository.save(customerSchedule);

        // Lưu thông tin hóa đơn Payment vào DB
        Payment payment = new Payment();
        payment.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        payment.setCreatedBy(userUtils.getUserWithAuthority());
        payment.setCustomerSchedule(customerSchedule);
        payment.setPayType(paymentRequest.getPayType());
        payment.setOrderId(orderId);
        payment.setRequestId(orderId);
        payment.setAmount(customerSchedule.getVaccineScheduleTime().getVaccineSchedule().getVaccine().getPrice());
        paymentRepository.save(payment);
    }

    /**
     * Thực hiện nghiệp vụ Đổi ca tiêm (Đổi lịch hẹn tiêm sang khung giờ mới).
     * 
     * Quy tắc đổi lịch hẹn:
     * 1. Chỉ lịch ở trạng thái Chờ duyệt (pending), Đã duyệt (confirmed) hoặc Chưa tiêm/Hoãn tiêm (not_injected) mới được đổi.
     * 2. Thời gian đổi lịch:
     *    - Đối với lịch hẹn trong tương lai: Phải đổi trước ca tiêm ít nhất 24 giờ.
     *    - Đối với ca tiêm cũ đã diễn ra hoặc bị trễ hẹn: Cho phép gia hạn đổi lịch trong vòng 24 giờ kể từ lúc ca tiêm cũ kết thúc.
     * 3. Khung giờ mới chọn phải ở tương lai, khác khung giờ cũ hiện tại.
     * 4. Ca tiêm mới phải còn chỗ trống (số lượng đã đặt < limitPeople).
     * 5. Tổng số lần tự đổi lịch của 1 đơn đặt tiêm không vượt quá 3 lần (MAX_CHANGE_TIMES).
     * 6. Lưu thông tin lịch sử thay đổi vào bảng ScheduleChangeHistory phục vụ đối soát.
     * 7. Tự động gỡ phân công Bác sĩ và Y tá phụ trách cũ (để hệ thống phân công lại theo lịch mới).
     * 8. Khôi phục trạng thái lịch hẹn về 'confirmed' (Đã duyệt) nếu ca trước đó bị hoãn tiêm để tiếp tục đi tiêm lại.
     */
    @Transactional
    public void change(Long id, Long timeId) {
        CustomerSchedule customerSchedule = customerScheduleRepository.findById(id)
                .orElseThrow(() -> new MessageException("Không tìm thấy lịch tiêm"));
        VaccineScheduleTime newTime = vaccineScheduleTimeRepository.findById(timeId)
                .orElseThrow(() -> new MessageException("Khung giờ tiêm không tồn tại"));

        VaccineScheduleTime oldTime = customerSchedule.getVaccineScheduleTime();
        if (oldTime == null) {
            throw new MessageException("Lịch tiêm chưa có slot ban đầu — không thể đổi");
        }

        /* ─── 1. Kiểm tra trạng thái hợp lệ để đổi ─── */
        StatusCustomerSchedule st = customerSchedule.getStatusCustomerSchedule();
        
        // KIỂM TRA QUYỀN HẠN: Admin có quyền đổi mọi trạng thái kể cả đã bị hủy (cancelled)
        User loggedInUser = userUtils.getUserWithAuthority();
        boolean isAdmin = loggedInUser != null && loggedInUser.getAuthorities() != null &&
                com.web.utils.Contains.ROLE_ADMIN.equals(loggedInUser.getAuthorities().getName());

        if (!isAdmin) {
            // Khách hàng tự đổi lịch: Chỉ đổi được khi đang chờ duyệt, đã duyệt hoặc bị bác sĩ hoãn tiêm
            if (st != StatusCustomerSchedule.pending && st != StatusCustomerSchedule.confirmed && st != StatusCustomerSchedule.not_injected) {
                throw new MessageException("Chỉ đổi được lịch ở trạng thái 'Chờ duyệt', 'Đã duyệt' hoặc 'Chưa tiêm/Hoãn tiêm'");
            }
        }

        /* ─── 2. Kiểm tra khoảng thời gian đổi lịch ─── */
        if (!isAdmin) {
            // Chỉ bắt buộc hạn 24h đối với Khách hàng tự đổi
            if (oldTime.getInjectDate() != null) {
                java.time.LocalDate oldDate = oldTime.getInjectDate().toLocalDate();
                java.time.LocalTime oldStart = oldTime.getStart() != null ? oldTime.getStart().toLocalTime() : java.time.LocalTime.MIN;
                java.time.LocalTime oldEnd = oldTime.getEnd() != null ? oldTime.getEnd().toLocalTime() : java.time.LocalTime.MAX;
                
                java.time.LocalDateTime startAt = oldDate.atTime(oldStart);
                java.time.LocalDateTime endAt = oldDate.atTime(oldEnd);
                java.time.LocalDateTime now = java.time.LocalDateTime.now();

                if (now.isBefore(startAt)) {
                    // Ca tiêm ở tương lai -> Bắt buộc thực hiện trước ca tiêm tối thiểu 24 giờ
                    long hoursLeft = java.time.Duration.between(now, startAt).toHours();
                    if (hoursLeft < MIN_HOURS_BEFORE_INJECT) {
                        throw new MessageException("Chỉ được đổi lịch hẹn tương lai khi còn ít nhất "
                                + MIN_HOURS_BEFORE_INJECT + " giờ trước giờ tiêm (hiện còn " + hoursLeft + "h)");
                    }
                } else {
                    // Ca tiêm cũ đã diễn ra hoặc bị hoãn -> Cho phép đổi lịch trong vòng 24 giờ kể từ lúc ca tiêm kết thúc
                    java.time.LocalDateTime gracePeriodEnd = endAt.plusHours(24);
                    if (now.isAfter(gracePeriodEnd)) {
                        throw new MessageException("Đã quá hạn 24 giờ kể từ ca tiêm cũ, bạn không thể đổi lịch nữa.");
                    }
                }
            }
        }

        /* Kiểm tra: Ca tiêm mới phải ở tương lai, không cho phép chọn ca quá khứ */
        if (newTime.getInjectDate() != null) {
            java.time.LocalDate newLd = newTime.getInjectDate().toLocalDate();
            if (newLd.isBefore(java.time.LocalDate.now())) {
                throw new MessageException("Không thể chọn khung giờ tiêm trong quá khứ");
            }
        }

        /* ─── 3. Kiểm tra khung giờ mới khác khung giờ cũ ─── */
        if (oldTime.getId().equals(newTime.getId())) {
            throw new MessageException("Bạn đang chọn lại đúng slot hiện tại");
        }

        /* ─── 4. Kiểm tra sức chứa của ca tiêm mới ─── */
        long registered = customerScheduleRepository.countByVaccineScheduleTimeId(newTime.getId());
        int limit = newTime.getLimitPeople() == null ? 0 : newTime.getLimitPeople();
        if (registered >= limit) {
            throw new MessageException("Khung giờ này đã đầy (" + registered + "/" + limit + ")");
        }

        /* ─── 5. Kiểm tra giới hạn số lần đổi (Tối đa 3 lần) ─── */
        int counter = customerSchedule.getCounterChange() == null ? 0 : customerSchedule.getCounterChange();
        if (counter >= MAX_CHANGE_TIMES) {
            throw new MessageException("Bạn đã đổi lịch tối đa " + MAX_CHANGE_TIMES + " lần, không thể đổi tiếp");
        }

        /* ─── 6. Ghi nhận lịch sử đổi lịch (ScheduleChangeHistory) ─── */
        ScheduleChangeHistory history = ScheduleChangeHistory.builder()
                .customerScheduleId(customerSchedule.getId())
                .fromTimeId(oldTime.getId())
                .fromInjectDate(oldTime.getInjectDate())
                .fromStart(oldTime.getStart())
                .fromEnd(oldTime.getEnd())
                .toTimeId(newTime.getId())
                .toInjectDate(newTime.getInjectDate())
                .toStart(newTime.getStart())
                .toEnd(newTime.getEnd())
                .changedAt(new Timestamp(System.currentTimeMillis()))
                .changedByUserId(loggedInUser != null ? loggedInUser.getId() : (customerSchedule.getUser() != null ? customerSchedule.getUser().getId() : null))
                .build();
        scheduleChangeHistoryRepository.save(history);

        /* ─── 7. Cập nhật liên kết khung giờ mới và tăng bộ đếm ─── */
        customerSchedule.setVaccineScheduleTime(newTime);
        customerSchedule.setCounterChange(counter + 1);
        
        // Gỡ thông tin bác sĩ & y tá phân công cũ để nhân viên sắp xếp lại theo lịch/ngày mới
        customerSchedule.setDoctor(null);
        customerSchedule.setNurse(null);
        customerSchedule.setCompletedDate(null);
        
        // Khôi phục trạng thái về 'confirmed' hoặc 'pending' tùy thuộc vào việc đã đóng tiền hay chưa
        if (st == StatusCustomerSchedule.not_injected || st == StatusCustomerSchedule.cancelled) {
            if (customerSchedule.getPayStatus() == PayStatus.DA_THANH_TOAN) {
                customerSchedule.setStatusCustomerSchedule(StatusCustomerSchedule.confirmed);
            } else {
                customerSchedule.setStatusCustomerSchedule(StatusCustomerSchedule.pending);
            }
        }
        
        customerScheduleRepository.save(customerSchedule);

        /* ─── 8. Gửi Email thông báo thay đổi thông tin lịch hẹn tiêm ─── */
        try {
            User csUser = customerSchedule.getUser();
            if (csUser != null && csUser.getEmail() != null) {
                String html = EmailTemplateUtils.scheduleChange(
                        customerSchedule.getFullName() != null ? customerSchedule.getFullName() : csUser.getEmail(),
                        newTime.getVaccineSchedule().getVaccine().getName(),
                        newTime.getInjectDate() != null ? newTime.getInjectDate().toString() : "N/A",
                        newTime.getStart() + " - " + newTime.getEnd(),
                        MAX_CHANGE_TIMES - customerSchedule.getCounterChange());
                mailService.sendEmail(csUser.getEmail(),
                        "[iVaccine] Thay đổi lịch hẹn tiêm chủng", html, false, true);
            }
        } catch (Exception e) {
            System.err.println("[change] gửi email thất bại: " + e.getMessage());
        }
    }

    /**
     * Lấy lịch sử tất cả các lần đổi ca tiêm của một đơn lịch hẹn.
     */
    public List<ScheduleChangeHistory> getChangeHistory(Long customerScheduleId) {
        return scheduleChangeHistoryRepository.findByCustomerScheduleIdOrderByChangedAtDesc(customerScheduleId);
    }

    /**
     * Tìm kiếm lịch hẹn theo ID (Dùng kiểm tra quyền sở hữu).
     */
    public Optional<CustomerSchedule> findOptionalById(Long id) {
        return customerScheduleRepository.findById(id);
    }

    /**
     * Cập nhật thông tin tình trạng sức khỏe của khách hàng trước/sau khi tiêm.
     */
    public CustomerSchedule updateCustomerSchedule(UpdateCustomerSchedule request) {
        if (request.getId() == null) {
            throw new IllegalArgumentException("ID không được phép null");
        }

        CustomerSchedule customerSchedule = customerScheduleRepository.findById(request.getId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lịch trình"));

        if (request.getHealthStatusAfter() != null) {
            customerSchedule.setHealthStatusAfter(request.getHealthStatusAfter());
        }
        if (request.getHealthStatusBefore() != null) {
            customerSchedule.setHealthStatusBefore(request.getHealthStatusBefore());
        }

        if (request.getStatus() != null) {
            customerSchedule.setStatusCustomerSchedule(
                    StatusCustomerSchedule.getStatusCustomerSchedule(request.getStatus())
            );
        }

        return customerScheduleRepository.save(customerSchedule);
    }

    /**
     * Cập nhật trạng thái thanh toán thành ĐÃ THANH TOÁN (dùng khi đóng tiền trực tiếp tại quầy).
     */
    @Transactional
    public void updatePaymentStatus(Long id) {
        CustomerSchedule customerSchedule = customerScheduleRepository.findById(id)
                .orElseThrow(() -> new MessageException("Không tìm thấy lịch trình"));

        User loggedInUser = userUtils.getUserWithAuthority();
        if (loggedInUser == null) {
            throw new MessageException("Vui lòng đăng nhập trước khi thực hiện hành động này!");
        }

        customerSchedule.setPayStatus(PayStatus.DA_THANH_TOAN);
        customerSchedule.setCustomerSchedulePay(CustomerSchedulePay.THANH_TOAN_TAI_QUAY);
        customerScheduleRepository.save(customerSchedule);

        // Tạo hóa đơn đối soát thanh toán tiền mặt tại quầy
        Payment payment = new Payment();
        payment.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        payment.setCreatedBy(loggedInUser);
        payment.setCustomerSchedule(customerSchedule);
        payment.setPayType(PayType.TIEN_MAT);
        payment.setOrderId("COUNTER_" + customerSchedule.getId() + "_" + System.currentTimeMillis());
        payment.setRequestId(payment.getOrderId());
        payment.setAmount(customerSchedule.getVaccineScheduleTime().getVaccineSchedule().getVaccine().getPrice());
        paymentRepository.save(payment);
    }

    /**
     * Phân công Bác sĩ và Y tá phụ trách trực tiếp ca tiêm cho khách hàng.
     */
    public void assignDoctorNurse(AssignDoctorNurseRequest request) {
        CustomerSchedule schedule = customerScheduleRepository.findById(request.getCustomerScheduleId())
                .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy lịch đăng ký"));

        // Phân công Bác sĩ khám lâm sàng
        if (request.getDoctorId() != null) {
            Doctor doctor = doctorRepository.findById(request.getDoctorId())
                    .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy bác sĩ"));
            schedule.setDoctor(doctor);
        }

        // Phân công Y tá thực hiện tiêm
        if (request.getNurseId() != null) {
            Nurse nurse = nurseRepository.findById(request.getNurseId())
                    .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy y tá"));
            schedule.setNurse(nurse);
        }

        customerScheduleRepository.save(schedule);
    }

    /**
     * Lấy danh sách lịch tiêm được phân công cho Bác sĩ hiện tại đang đăng nhập.
     */
    public Page<ListCustomerScheduleResponse> listCustomerScheduleForDoctor(ListCustomerScheduleRequest request) {
        User currentUser = userUtils.getUserWithAuthority();
        Doctor doctor = doctorRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy thông tin bác sĩ"));

        Pageable pageable = PageRequest.of(request.getPage() - 1, request.getLimit(), Sort.by(Sort.Direction.DESC, "createdDate"));
        Page<CustomerSchedule> page = customerScheduleRepository.findByDoctor_Id(doctor.getId(), pageable);
        
        return page.map(e -> toResponseDto(e));
    }

    /**
     * Lấy danh sách lịch tiêm được phân công cho Y tá hiện tại đang đăng nhập.
     */
    public Page<ListCustomerScheduleResponse> listCustomerScheduleForNurse(ListCustomerScheduleRequest request) {
        User currentUser = userUtils.getUserWithAuthority();
        Nurse nurse = nurseRepository.findByUser_Id(currentUser.getId())
                .orElseThrow(() -> new MessageException(HttpStatus.NOT_FOUND.value(), "Không tìm thấy thông tin y tá"));

        Pageable pageable = PageRequest.of(request.getPage() - 1, request.getLimit(), Sort.by(Sort.Direction.DESC, "createdDate"));
        Page<CustomerSchedule> page = customerScheduleRepository.findByNurse_Id(nurse.getId(), pageable);
        
        return page.map(e -> toResponseDto(e));
    }

    /**
     * Ánh xạ thông tin đối tượng CustomerSchedule sang DTO ListCustomerScheduleResponse để gửi phản hồi về phía client.
     */
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
                .payStatus(e.getPayStatus() == PayStatus.DA_THANH_TOAN)
                .healthStatusAfter(e.getHealthStatusAfter())
                .healthStatusBefore(e.getHealthStatusBefore())
                .completedDate(e.getCompletedDate())
                .doctor(e.getDoctor())
                .nurse(e.getNurse())
                .build();
    }
}
