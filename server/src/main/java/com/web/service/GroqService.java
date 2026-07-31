package com.web.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.web.entity.*;
import com.web.enums.StatusCustomerSchedule;
import com.web.repository.AgeGroupRepository;
import com.web.repository.CenterRepository;
import com.web.repository.CustomerProfileRepository;
import com.web.repository.CustomerScheduleRepository;
import com.web.repository.VaccinationCertificateRepository;
import com.web.repository.VaccineRepository;
import com.web.repository.VaccineScheduleRepository;
import com.web.repository.VaccineScheduleTimeRepository;
import com.web.repository.VaccineTypeRepository;
import com.web.utils.UserUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * iVax — AI trợ lý tiêm chủng, dùng Groq Llama 3.1 với function calling.
 *
 * Khi user hỏi câu liên quan đến data hệ thống (lịch tiêm, vaccine cụ thể, …),
 * AI tự động gọi tool tương ứng để query DB live thay vì trả lời theo trí nhớ.
 */
@Service
public class GroqService {

    private static final Logger log = LoggerFactory.getLogger(GroqService.class);

    @Value("${groq.api-key}")          private String apiKey;
    @Value("${groq.api-url}")          private String apiUrl;
    @Value("${groq.model}")            private String model;
    @Value("${groq.history-max:10}")   private int historyMax;

    @Autowired private VaccineScheduleRepository vaccineScheduleRepo;
    @Autowired private VaccineRepository vaccineRepo;
    @Autowired private CenterRepository centerRepo;
    @Autowired private VaccineTypeRepository vaccineTypeRepo;
    @Autowired private AgeGroupRepository ageGroupRepo;
    @Autowired private VaccineScheduleTimeRepository vaccineScheduleTimeRepo;
    @Autowired private CustomerScheduleRepository customerScheduleRepo;
    @Autowired private CustomerProfileRepository customerProfileRepo;
    @Autowired private VaccinationCertificateRepository certRepo;
    @Autowired private UserUtils userUtils;

    private final ObjectMapper objectMapper = new ObjectMapper();
    /** Lịch sử hội thoại theo session — in-memory, không persist. */
    private final Map<String, Deque<Map<String, Object>>> sessionHistory = new ConcurrentHashMap<>();

    private static final String SYSTEM_PROMPT =
        // ── IDENTITY ────────────────────────────────────────────────────────
        "Bạn là iVax — trợ lý AI của iVaccine, hệ thống đặt lịch tiêm chủng trực tuyến tại Việt Nam. " +
        "Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, đúng trọng tâm.\n\n" +
        "=== QUY TẮC TRÌNH BÀY ===\n" +
        "- Tuyệt đối KHÔNG viết danh sách hay liệt kê dưới dạng một đoạn văn dài ngăn cách bằng dấu phẩy.\n" +
        "- Luôn sử dụng xuống dòng (ký tự \\n) và dấu gạch đầu dòng (\\n- ) để liệt kê danh sách vaccine, trung tâm, lịch hẹn, hoặc bất kỳ thông tin nào có nhiều hơn 2 mục.\n" +
        "- Mỗi mục trong danh sách phải nằm trên một dòng riêng biệt để người dùng dễ đọc.\n" +
        "- In đậm (sử dụng **) các thông tin quan trọng như tên vaccine hoặc trạng thái.\n" +
        "- Không dùng markdown heading (## hoặc ###).\n\n" +

        // ── TOOL CALLING ───────────────────────────────────────────────────
        "=== QUY TẮC DÙNG TOOL ===\n" +
        "Khi user hỏi về DỮ LIỆU HIỆN CÓ TRONG HỆ THỐNG (lịch tiêm sắp tới, danh sách vaccine, giá, ...), " +
        "BẮT BUỘC dùng tool tương ứng để query data live. TUYỆT ĐỐI KHÔNG bịa data.\n" +
        "- TUYỆT ĐỐI KHÔNG viết các câu giải thích hoặc thông báo về việc gọi tool/truy vấn dữ liệu (Ví dụ tránh: 'Tôi cần kiểm tra trực tuyến...', 'Tôi sẽ sử dụng công cụ...', 'Vui lòng chờ tôi quét...'). Hãy âm thầm gọi tool và chỉ trả về câu trả lời cuối cùng sau khi đã có kết quả thực tế.\n" +
        "Nếu user hỏi câu kiến thức chung (vaccine gì phòng bệnh gì, tác dụng phụ, độ tuổi tiêm chuẩn) → trả lời thẳng bằng kiến thức bên dưới.\n" +
        "Khi user nói 'tôi', 'của tôi', 'lịch tôi đã đặt', 'mũi đã tiêm của tôi', 'giấy của tôi' " +
        "→ DÙNG các tool 'getMy*' để query data của user đang đăng nhập. " +
        "TUYỆT ĐỐI KHÔNG gọi các tool 'getMy*' khi user chỉ hỏi thông tin chung của hệ thống (như lịch tiêm chung, giá vaccine, hoặc số slot trống của một ca tiêm cụ thể). " +
        "Nếu tool trả về 'requireLogin=true' → bảo user vui lòng đăng nhập trước (link /dang-nhap).\n\n" +

        // ── QUY TẮC QUAN TRỌNG ──────────────────────────────────────────────
        "=== QUY TẮC BẮT BUỘC ===\n" +
        "1. iVaccine là hệ thống TRỰC TUYẾN — mọi thao tác (đặt/đổi/hủy lịch) đều trên website.\n" +
        "2. KHÔNG yêu cầu khách 'đến trực tiếp trung tâm' hay 'gọi điện' để đổi/hủy lịch.\n" +
        "3. KHÔNG chẩn đoán bệnh hay kê đơn thuốc — chỉ tư vấn vaccine phòng ngừa.\n" +
        "4. Cấp cứu → gọi 115 ngay.\n" +
        "5. Bạn KHÔNG thể đặt lịch giúp khách. Nếu khách muốn đặt, hướng dẫn họ vào /dang-ky-tiem-chung.\n\n" +

        // ── THÔNG TIN HỆ THỐNG ─────────────────────────────────────────────
        "=== THÔNG TIN HỆ THỐNG ===\n" +
        "Website: ivaccine.vn | Hotline: 0342.046.981 | Thanh toán: VNPay, PayPal, tiền mặt.\n" +
        "Đặt lịch: /dang-ky-tiem-chung | Lịch của tôi: /lich-da-dang-ky | Tra cứu: /tra-cuu-lich-tiem\n\n" +

        // ── KIẾN THỨC VACCINE NGẮN GỌN ─────────────────────────────────────
        "=== KIẾN THỨC VACCINE THEO ĐỘ TUỔI ===\n" +
        "- 0–1 tháng: Viêm gan B, BCG (lao)\n" +
        "- 2–6 tháng: 5in1/6in1, phế cầu, rotavirus\n" +
        "- 9–12 tháng: MMR (sởi-quai bị-rubella), thủy đậu, viêm não Nhật Bản\n" +
        "- 1–6 tuổi: Nhắc MMR, cúm hàng năm, viêm gan A\n" +
        "- 9–14 tuổi: HPV (2–3 mũi)\n" +
        "- Người lớn: Cúm, viêm gan A+B, Tdap, HPV (đến 45 tuổi)\n" +
        "- ≥65 tuổi: Cúm, phế cầu, zona\n\n" +
        "SAU TIÊM bình thường: đau/sưng chỗ tiêm, sốt nhẹ <38.5°C → chườm lạnh, paracetamol, nghỉ ngơi, ở lại 30 phút.\n" +
        "CẦN CẤP CỨU: sốt >39°C kéo dài, khó thở, phát ban toàn thân → gọi 115.";

    /* ═══════════════════════════════════════════════════════════════════
       Main entry point: nhận message, query AI có tool, trả về câu trả lời
       ═══════════════════════════════════════════════════════════════════ */
    public String chatWithAI(String sessionId, String userMessage) {
        if (sessionId == null || sessionId.isEmpty()) sessionId = "default";

        try {
            // Build conversation = system + history + user msg
            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(msg("system", SYSTEM_PROMPT));
            messages.addAll(getHistory(sessionId));
            messages.add(msg("user", userMessage));

            String finalAnswer = null;
            int MAX_ROUNDS = 3;     // tránh infinite loop nếu AI cứ gọi tool

            for (int round = 0; round < MAX_ROUNDS; round++) {
                Map<String, Object> response;
                try {
                    response = callGroq(messages, true);     // có tools
                } catch (HttpClientErrorException ex) {
                    String body = ex.getResponseBodyAsString();
                    if (body != null && body.contains("tool_use_failed")) {
                        // Model fail format tool — retry không có tools để vẫn có câu trả lời
                        log.warn("[Groq] tool_use_failed, fallback gọi không tools");
                        response = callGroq(messages, false);
                    } else {
                        throw ex;
                    }
                }
                Map<String, Object> assistantMsg = extractAssistantMessage(response);

                if (assistantMsg == null) break;
                messages.add(assistantMsg);

                Object toolCallsObj = assistantMsg.get("tool_calls");
                if (!(toolCallsObj instanceof List)) {
                    // Không có tool call → đây là câu trả lời cuối
                    Object content = assistantMsg.get("content");
                    finalAnswer = content == null ? "" : content.toString();
                    break;
                }

                // AI yêu cầu gọi tool → execute và append result
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> toolCalls = (List<Map<String, Object>>) toolCallsObj;
                for (Map<String, Object> call : toolCalls) {
                    String callId = (String) call.get("id");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> fn = (Map<String, Object>) call.get("function");
                    String name = (String) fn.get("name");
                    String argsJson = String.valueOf(fn.get("arguments"));
                    Map<String, Object> args = parseArgs(argsJson);

                    Object result = executeTool(name, args);
                    String resultJson = objectMapper.writeValueAsString(result);
                    log.info("[Groq Tool] {}({}) → {}", name, args, truncate(resultJson, 200));

                    Map<String, Object> toolMsg = new HashMap<>();
                    toolMsg.put("role", "tool");
                    toolMsg.put("tool_call_id", callId);
                    toolMsg.put("content", resultJson);
                    messages.add(toolMsg);
                }
            }

            if (finalAnswer == null || finalAnswer.isBlank()) {
                finalAnswer = "Xin lỗi, tôi không thể trả lời câu hỏi này. Vui lòng thử lại.";
            }

            saveToHistory(sessionId, userMessage, finalAnswer);
            return finalAnswer;
        } catch (Exception e) {
            log.error("[Groq] Error: {}", e.getMessage(), e);
            return "Xin lỗi, hiện tại tôi không thể trả lời. Vui lòng thử lại sau nhé!";
        }
    }

    /* ─── Gọi Groq API. withTools=true thì gửi tools[]+tool_choice=auto ─── */
    @SuppressWarnings("unchecked")
    private Map<String, Object> callGroq(List<Map<String, Object>> messages, boolean withTools) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        if (withTools) {
            body.put("tools", buildTools());
            body.put("tool_choice", "auto");
        }
        body.put("stream", false);

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
        ResponseEntity<Map> resp = restTemplate.postForEntity(apiUrl, req, Map.class);
        return resp.getBody();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractAssistantMessage(Map<String, Object> response) {
        if (response == null) return null;
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices == null || choices.isEmpty()) return null;
        return (Map<String, Object>) choices.get(0).get("message");
    }

    /* ═══════════════════════════════════════════════════════════════════
       TOOL DEFINITIONS — JSON schema để AI biết khi nào gọi tool nào
       ═══════════════════════════════════════════════════════════════════ */
    private List<Map<String, Object>> buildTools() {
        List<Map<String, Object>> tools = new ArrayList<>();

        /* ─── Tool 1: liệt kê lịch tiêm sắp tới / đang mở ─── */
        tools.add(tool(
            "listUpcomingSchedules",
            "Tra cứu các lịch tiêm vaccine ĐANG MỞ hoặc SẮP TỚI trong hệ thống iVaccine. " +
            "Dùng khi user hỏi: 'có lịch tiêm vaccine X không?', 'dạo này có lịch gì?', " +
            "'trung tâm Y có mở lịch không?', 'tuần này tiêm được vaccine gì?'.",
            paramObj(
                paramStr("vaccineName", "Tên vaccine cần tìm (có thể chỉ một phần tên). VD: 'sởi', '6in1', 'HPV'. Bỏ trống nếu user không yêu cầu cụ thể."),
                paramStr("centerName",  "Tên trung tâm tiêm cần tìm (có thể chỉ một phần). VD: 'Cầu Giấy', 'VaxFUDA'."),
                paramStr("fromDate",    "Ngày bắt đầu khoảng thời gian, định dạng yyyy-MM-dd."),
                paramStr("toDate",      "Ngày kết thúc khoảng thời gian, định dạng yyyy-MM-dd.")
            )
        ));

        /* ─── Tool 2: tìm vaccine theo tên / loại ─── */
        tools.add(tool(
            "searchVaccines",
            "Tìm thông tin về các vaccine có trong hệ thống iVaccine. " +
            "Trả về danh sách vaccine kèm giá, nhà sản xuất, độ tuổi tiêm, số mũi, " +
            "số lượng tồn kho. Dùng khi user hỏi: 'có vaccine X không?', 'vaccine HPV bao nhiêu tiền?', " +
            "'vaccine cho trẻ 6 tháng có gì?'.",
            paramObj(
                paramStr("keyword", "Từ khóa tên vaccine (có thể chỉ một phần). VD: 'sởi', 'HPV', '6in1'. Bỏ trống để liệt kê tất cả.")
            )
        ));

        /* ════════════ PHASE 2 — 5 tool nhóm A (public, không cần đăng nhập) ════════════ */

        /* ─── Tool 3: chi tiết 1 vaccine ─── */
        tools.add(tool(
            "getVaccineDetails",
            "Lấy thông tin CHI TIẾT của 1 vaccine cụ thể: mô tả, nhà sản xuất, loại, độ tuổi, " +
            "số mũi tối đa, khoảng cách giữa các mũi, tồn kho, hạn sử dụng. " +
            "Dùng khi user muốn hiểu sâu về 1 vaccine: 'vaccine X tiêm mấy mũi?', " +
            "'khoảng cách giữa 2 mũi vaccine Y là bao lâu?', 'vaccine Z phù hợp độ tuổi nào?'.",
            paramObj(
                paramStr("vaccineName", "Tên vaccine (có thể chỉ một phần). VD: 'sởi', 'HPV', '6in1'.")
            )
        ));

        /* ─── Tool 4: tìm trung tâm tiêm ─── */
        tools.add(tool(
            "findCenters",
            "Tìm các trung tâm tiêm chủng trong hệ thống iVaccine theo tên hoặc địa chỉ. " +
            "Dùng khi user hỏi: 'có trung tâm nào ở Hà Nội?', 'trung tâm X ở đâu?', " +
            "'có chi nhánh nào gần Cầu Giấy không?'.",
            paramObj(
                paramStr("keyword", "Từ khóa tên trung tâm (có thể chỉ một phần). Bỏ trống nếu không có."),
                paramStr("city",     "Thành phố lọc. VD: 'Hà Nội', 'TP.HCM'. Bỏ trống nếu không có."),
                paramStr("district", "Quận/huyện. VD: 'Cầu Giấy'. Bỏ trống nếu không có.")
            )
        ));

        /* ─── Tool 5: số slot còn trống ─── */
        tools.add(tool(
            "checkSlotsRemaining",
            "Kiểm tra số chỗ trống còn lại của các khung giờ tiêm. " +
            "Dùng khi user hỏi: 'lịch tiêm ngày X còn chỗ không?', 'B1 lúc 8h sáng còn slot không?', 'còn slot trống ca sáng không?'. " +
            "Có thể truyền trực tiếp ID nếu biết, hoặc tìm kiếm bằng các tham số tự nhiên khác.",
            paramObj(
                paramStr("scheduleTimeId", "ID của VaccineScheduleTime (nếu đã biết). Bỏ trống nếu tìm kiếm theo tên/ngày/giờ/trung tâm."),
                paramStr("vaccineName", "Tên vaccine cần kiểm tra (VD: 'B1', '6in1', 'HPV')."),
                paramStr("injectDate", "Ngày tiêm cần kiểm tra, định dạng yyyy-MM-dd (VD: '2026-06-19')."),
                paramStr("time", "Khung giờ bắt đầu tiêm, định dạng HH:mm (VD: '08:00', '14:30')."),
                paramStr("centerName", "Tên trung tâm tiêm (VD: 'Cầu Giấy').")
            )
        ));

        /* ─── Tool 6: vaccine phù hợp độ tuổi ─── */
        tools.add(tool(
            "getVaccinesForAge",
            "Liệt kê các vaccine PHÙ HỢP với một độ tuổi cụ thể. " +
            "Dùng khi user hỏi: 'con tôi 3 tháng nên tiêm vaccine gì?', 'người lớn 30 tuổi tiêm gì?', " +
            "'trẻ 12 tuổi tiêm HPV được không?'.",
            paramObj(
                paramStr("age",     "Số tuổi/tháng. VD: '6', '12', '30'."),
                paramStr("ageUnit", "'month' nếu là tháng tuổi, 'year' nếu là năm tuổi. Mặc định 'year'.")
            )
        ));

        /* ─── Tool 7: liệt kê loại vaccine ─── */
        tools.add(tool(
            "listVaccineTypes",
            "Liệt kê tất cả các LOẠI VACCINE trong hệ thống (vd: vaccine sống giảm độc lực, vaccine bất hoạt, mRNA, ...). " +
            "Dùng khi user hỏi: 'có những loại vaccine nào?', 'phân loại vaccine ra sao?'.",
            paramObj()
        ));

        /* ════════════ PHASE 3 — 4 tool user-specific (yêu cầu đăng nhập) ════════════ */

        /* ─── Tool 8: lịch tiêm sắp tới CỦA TÔI ─── */
        tools.add(tool(
            "getMyUpcomingAppointments",
            "Lấy danh sách LỊCH TIÊM SẮP TỚI của user ĐANG ĐĂNG NHẬP. " +
            "BẮT BUỘC dùng khi user hỏi: 'lịch tiêm sắp tới của tôi', 'tôi có hẹn tiêm khi nào', " +
            "'lịch tôi đã đặt còn không?'. " +
            "Trả về các lịch có status=pending|confirmed và injectDate >= hôm nay.",
            paramObj()
        ));

        /* ─── Tool 9: lịch sử tiêm CỦA TÔI ─── */
        tools.add(tool(
            "getMyVaccinationHistory",
            "Lấy LỊCH SỬ TIÊM (đã hoàn tất) của user ĐANG ĐĂNG NHẬP. " +
            "BẮT BUỘC dùng khi user hỏi: 'tôi đã tiêm những vaccine gì', 'lịch sử tiêm của tôi', " +
            "'tôi tiêm mũi X bao giờ rồi?'. " +
            "Trả về các mũi đã inject/finished, sắp xếp mới nhất trước.",
            paramObj()
        ));

        /* ─── Tool 10: gợi ý mũi tiếp theo CỦA TÔI ─── */
        tools.add(tool(
            "getMyRecommendedNext",
            "Gợi ý các MŨI TIÊM TIẾP THEO cho user ĐANG ĐĂNG NHẬP dựa vào: tuổi (profile.birthdate), " +
            "vaccine đã tiêm, maxDose từng vaccine. Trả về các vaccine: " +
            "(a) đã tiêm 1 mũi nhưng chưa đủ maxDose → gợi ý mũi tiếp; " +
            "(b) chưa tiêm + phù hợp độ tuổi. " +
            "Dùng khi user hỏi: 'tôi nên tiêm gì tiếp theo?', 'còn vaccine nào tôi nên tiêm không?'.",
            paramObj()
        ));

        /* ─── Tool 11: giấy chứng nhận CỦA TÔI ─── */
        tools.add(tool(
            "getMyCertificates",
            "Lấy danh sách GIẤY CHỨNG NHẬN TIÊM CHỦNG của user ĐANG ĐĂNG NHẬP. " +
            "Dùng khi user hỏi: 'giấy chứng nhận của tôi', 'tôi có những giấy gì rồi?', " +
            "'tôi tải giấy ở đâu?'. Trả về serial, vaccine, ngày cấp, status revoked.",
            paramObj()
        ));

        return tools;
    }

    /* ═══════════════════════════════════════════════════════════════════
       TOOL EXECUTION — switch theo name, gọi repo, trả Object JSON-serializable
       ═══════════════════════════════════════════════════════════════════ */
    private Object executeTool(String name, Map<String, Object> args) {
        try {
            switch (name) {
                case "listUpcomingSchedules":     return tool_listUpcomingSchedules(args); // lịch sắp tới
                case "searchVaccines":            return tool_searchVaccines(args); // tìm kiếm vaccine
                /* ── Phase 2 — public tools ── */
                case "getVaccineDetails":         return tool_getVaccineDetails(args); // chi tiết vaccine của hệ thống
                case "findCenters":               return tool_findCenters(args); // tìm trung tâm theo tên/địa chỉ
                case "checkSlotsRemaining":       return tool_checkSlotsRemaining(args); // kiểm tra slot còn trống của khung giờ tiêm
                case "getVaccinesForAge":         return tool_getVaccinesForAge(args); // vaccine phù hợp độ tuổi
                case "listVaccineTypes":          return tool_listVaccineTypes(args); // liệt kê loại vaccine
                /* ── Phase 3 — user-specific tools ── */
                case "getMyUpcomingAppointments": return tool_getMyUpcomingAppointments(args); // lịch tiêm sắp tới của tôi
                case "getMyVaccinationHistory":   return tool_getMyVaccinationHistory(args); // lịch sử tiêm của tôi
                case "getMyRecommendedNext":      return tool_getMyRecommendedNext(args); // gợi ý mũi tiếp theo của tôi
                case "getMyCertificates":         return tool_getMyCertificates(args); // giấy chứng nhận của tôi
                default:
                    return Map.of("error", "Tool '" + name + "' không tồn tại");
            }
        } catch (Exception e) {
            log.error("[Groq Tool] Error executing {}: {}", name, e.getMessage(), e);
            return Map.of("error", "Không thể lấy dữ liệu, vui lòng thử lại");
        }
    }

    private Object tool_listUpcomingSchedules(Map<String, Object> args) {
        String vaccineName = strArg(args, "vaccineName");
        String centerName  = strArg(args, "centerName");
        LocalDate fromDate = dateArg(args, "fromDate");
        LocalDate toDate   = dateArg(args, "toDate");

        // Status null → query ALL, sau đó filter những lịch còn hiệu lực
        var page = vaccineScheduleRepo.findAdvancedSearch(
            vaccineName, centerName, fromDate, toDate, null, PageRequest.of(0, 20)
        );

        LocalDate today = LocalDate.now();
        List<Map<String, Object>> out = new ArrayList<>();
        for (VaccineSchedule v : page.getContent()) {
            // Chỉ lấy lịch còn hiệu lực (endDate >= today)
            if (v.getEndDate() == null) continue;
            LocalDate endLd = v.getEndDate().toLocalDate();
            if (endLd.isBefore(today)) continue;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", v.getId());
            item.put("vaccineName", v.getVaccine() != null ? v.getVaccine().getName() : null);
            item.put("price",       v.getVaccine() != null ? v.getVaccine().getPrice() : null);
            item.put("centerName",  v.getCenter()  != null ? v.getCenter().getCenterName() : null);
            item.put("startDate",   v.getStartDate() != null ? v.getStartDate().toString() : null);
            item.put("endDate",     v.getEndDate().toString());
            item.put("limitPeople", v.getLimitPeople());
            // status: ACTIVE/UPCOMING
            LocalDate startLd = v.getStartDate() != null ? v.getStartDate().toLocalDate() : today;
            item.put("status", startLd.isAfter(today) ? "SẮP MỞ" : "ĐANG MỞ");

            // Lấy thêm danh sách các khung giờ và số slot trống
            List<VaccineScheduleTime> times = vaccineScheduleTimeRepo.findAllByVaccineScheduleId(v.getId());
            List<Map<String, Object>> timeList = new ArrayList<>();
            for (VaccineScheduleTime t : times) {
                if (t.getInjectDate() != null && t.getInjectDate().toLocalDate().isBefore(today)) {
                    continue;
                }
                long registered = customerScheduleRepo.countByVaccineScheduleTimeId(t.getId());
                int limit = t.getLimitPeople() == null ? 0 : t.getLimitPeople();
                long remaining = Math.max(0, limit - registered);

                Map<String, Object> tMap = new LinkedHashMap<>();
                tMap.put("id", t.getId());
                tMap.put("injectDate", t.getInjectDate() != null ? t.getInjectDate().toString() : null);
                
                String startStr = t.getStart() != null ? t.getStart().toString() : null;
                if (startStr != null && startStr.length() >= 5) startStr = startStr.substring(0, 5);
                String endStr = t.getEnd() != null ? t.getEnd().toString() : null;
                if (endStr != null && endStr.length() >= 5) endStr = endStr.substring(0, 5);

                tMap.put("start", startStr);
                tMap.put("end", endStr);
                tMap.put("limit", limit);
                tMap.put("remaining", remaining);
                timeList.add(tMap);
            }
            item.put("timeSlots", timeList);

            out.add(item);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalFound", out.size());
        result.put("schedules", out);
        if (out.isEmpty()) {
            result.put("message", "Không tìm thấy lịch tiêm nào phù hợp với điều kiện.");
        }
        return result;
    }

    private Object tool_searchVaccines(Map<String, Object> args) {
        String keyword = strArg(args, "keyword");
        List<Vaccine> vaccines;
        if (keyword == null || keyword.isBlank()) {
            vaccines = vaccineRepo.findAll(PageRequest.of(0, 30)).getContent();
        } else {
            vaccines = vaccineRepo.findByParam("%" + keyword + "%", PageRequest.of(0, 20)).getContent();
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (Vaccine v : vaccines) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", v.getId());
            item.put("name", v.getName());
            item.put("price", v.getPrice());
            item.put("manufacturer", v.getManufacturer() != null ? v.getManufacturer().getName() : null);
            item.put("vaccineType",  v.getVaccineType()  != null ? v.getVaccineType().getTypeName() : null);
            item.put("ageRange",     v.getAgeGroup()     != null ? v.getAgeGroup().getAgeRange() : null);
            item.put("maxDose", v.getMaxDose());
            item.put("inventory", v.getInventory());
            item.put("status", "ACTIVE".equalsIgnoreCase(v.getStatus()) ? "Đang kinh doanh" : "Ngừng kinh doanh");
            out.add(item);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalFound", out.size());
        result.put("vaccines", out);
        if (out.isEmpty()) {
            result.put("message", "Không tìm thấy vaccine nào phù hợp.");
        }
        return result;
    }

    /* ═══════════════════════════════════════════════════════════════════
       PHASE 2 — PUBLIC TOOLS (không cần đăng nhập)
       ═══════════════════════════════════════════════════════════════════ */

    /** Tool 3: chi tiết 1 vaccine cụ thể */
    private Object tool_getVaccineDetails(Map<String, Object> args) {
        String name = strArg(args, "vaccineName");
        if (name == null || name.isBlank()) {
            return Map.of("error", "Vui lòng cung cấp tên vaccine.");
        }
        var page = vaccineRepo.findByParam("%" + name + "%", PageRequest.of(0, 5));
        if (page.isEmpty()) {
            return Map.of("totalFound", 0, "message", "Không tìm thấy vaccine '" + name + "'.");
        }

        List<Map<String, Object>> out = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (Vaccine v : page.getContent()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", v.getId());
            item.put("name", v.getName());
            item.put("description", v.getDescription());
            item.put("price", v.getPrice());
            item.put("manufacturer",  v.getManufacturer() != null ? v.getManufacturer().getName() : null);
            item.put("vaccineType",   v.getVaccineType()  != null ? v.getVaccineType().getTypeName() : null);
            item.put("ageRange",      v.getAgeGroup()     != null ? v.getAgeGroup().getAgeRange() : null);
            item.put("maxDose", v.getMaxDose());
            item.put("minIntervalMonths", v.getMinIntervalMonths());
            item.put("inventory", v.getInventory());
            if (v.getExpirationDate() != null) {
                LocalDate exp = v.getExpirationDate().toLocalDateTime().toLocalDate();
                item.put("expirationDate", exp.toString());
                item.put("expired", exp.isBefore(today));
            }
            item.put("status", "ACTIVE".equalsIgnoreCase(v.getStatus()) ? "Đang kinh doanh" : "Ngừng kinh doanh");
            out.add(item);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalFound", out.size());
        result.put("vaccines", out);
        return result;
    }

    /** Tool 4: tìm trung tâm theo tên/city/district */
    private Object tool_findCenters(Map<String, Object> args) {
        String keyword  = strArg(args, "keyword");
        String city     = strArg(args, "city");
        String district = strArg(args, "district");

        // Lấy hết rồi filter trong Java vì repo Center hiện không có advanced search
        List<Center> all = centerRepo.findAll();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Center c : all) {
            if (keyword != null && (c.getCenterName() == null
                    || !c.getCenterName().toLowerCase().contains(keyword.toLowerCase()))) continue;
            if (city != null && (c.getCity() == null
                    || !c.getCity().toLowerCase().contains(city.toLowerCase()))) continue;
            if (district != null && (c.getDistrict() == null
                    || !c.getDistrict().toLowerCase().contains(district.toLowerCase()))) continue;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", c.getId());
            item.put("centerName", c.getCenterName());
            item.put("city", c.getCity());
            item.put("district", c.getDistrict());
            item.put("ward", c.getWard());
            item.put("street", c.getStreet());
            item.put("fullAddress", joinNonEmpty(", ", c.getStreet(), c.getWard(), c.getDistrict(), c.getCity()));
            out.add(item);
            if (out.size() >= 30) break;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalFound", out.size());
        result.put("centers", out);
        if (out.isEmpty()) result.put("message", "Không tìm thấy trung tâm phù hợp.");
        return result;
    }

    /** Tool 5: số slot còn trống của VaccineScheduleTime (hỗ trợ cả tìm kiếm theo tên/ngày/giờ/trung tâm) */
    private Object tool_checkSlotsRemaining(Map<String, Object> args) {
        String idStr = strArg(args, "scheduleTimeId");
        if (idStr != null && !idStr.isBlank()) {
            Long stId;
            try { stId = Long.parseLong(idStr.trim()); }
            catch (Exception e) { return Map.of("error", "scheduleTimeId phải là số."); }

            var opt = vaccineScheduleTimeRepo.findById(stId);
            if (opt.isEmpty()) return Map.of("error", "Không tìm thấy khung giờ #" + stId);
            return buildSlotInfo(opt.get());
        }

        // Tìm kiếm linh hoạt theo Tên Vaccine, Ngày, Khung Giờ, Trung tâm
        String vaccineName = strArg(args, "vaccineName");
        String injectDate  = strArg(args, "injectDate");
        String time        = strArg(args, "time");
        String centerName  = strArg(args, "centerName");

        List<VaccineScheduleTime> all = vaccineScheduleTimeRepo.findAll();
        List<Map<String, Object>> matches = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (VaccineScheduleTime st : all) {
            if (st.getInjectDate() != null && st.getInjectDate().toLocalDate().isBefore(today)) {
                continue;
            }
            if (st.getVaccineSchedule() == null) continue;
            VaccineSchedule vs = st.getVaccineSchedule();

            if (vaccineName != null && !vaccineName.isBlank()) {
                if (vs.getVaccine() == null || !vs.getVaccine().getName().toLowerCase().contains(vaccineName.toLowerCase())) {
                    continue;
                }
            }
            if (centerName != null && !centerName.isBlank()) {
                if (vs.getCenter() == null || !vs.getCenter().getCenterName().toLowerCase().contains(centerName.toLowerCase())) {
                    continue;
                }
            }
            if (injectDate != null && !injectDate.isBlank()) {
                if (st.getInjectDate() == null || !st.getInjectDate().toString().equals(injectDate)) {
                    continue;
                }
            }
            if (time != null && !time.isBlank()) {
                String startStr = st.getStart() != null ? st.getStart().toString() : "";
                if (!startStr.contains(time)) {
                    continue;
                }
            }

            matches.add(buildSlotInfo(st));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalFound", matches.size());
        result.put("slots", matches);
        if (matches.isEmpty()) {
            result.put("message", "Không tìm thấy khung giờ tiêm nào khớp với yêu cầu.");
        }
        return result;
    }

    private Map<String, Object> buildSlotInfo(VaccineScheduleTime st) {
        long registered = customerScheduleRepo.countByVaccineScheduleTimeId(st.getId());
        int limit = st.getLimitPeople() == null ? 0 : st.getLimitPeople();
        long remaining = Math.max(0, limit - registered);

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("scheduleTimeId", st.getId());
        r.put("injectDate", st.getInjectDate() != null ? st.getInjectDate().toString() : null);
        
        String startStr = st.getStart() != null ? st.getStart().toString() : null;
        if (startStr != null && startStr.length() >= 5) startStr = startStr.substring(0, 5);
        String endStr = st.getEnd() != null ? st.getEnd().toString() : null;
        if (endStr != null && endStr.length() >= 5) endStr = endStr.substring(0, 5);

        r.put("start", startStr);
        r.put("end",   endStr);
        r.put("limit", limit);
        r.put("registered", registered);
        r.put("remaining", remaining);
        r.put("full", remaining == 0);
        if (st.getVaccineSchedule() != null) {
            VaccineSchedule vs = st.getVaccineSchedule();
            r.put("vaccineName", vs.getVaccine() != null ? vs.getVaccine().getName() : null);
            r.put("centerName",  vs.getCenter()  != null ? vs.getCenter().getCenterName() : null);
        }
        return r;
    }

    /** Tool 6: vaccine phù hợp độ tuổi */
    private Object tool_getVaccinesForAge(Map<String, Object> args) {
        String ageStr = strArg(args, "age");
        String unit   = strArg(args, "ageUnit");
        if (ageStr == null) return Map.of("error", "Vui lòng cung cấp tuổi.");

        int age;
        try { age = Integer.parseInt(ageStr.trim()); }
        catch (Exception e) { return Map.of("error", "Tuổi phải là số nguyên."); }

        // Quy đổi về tháng cho dễ so sánh
        boolean isMonth = unit != null && unit.toLowerCase().startsWith("month");
        int ageMonths = isMonth ? age : age * 12;

        // Duyệt vaccine, parse ageRange, check match
        List<Vaccine> all = vaccineRepo.findAll();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Vaccine v : all) {
            if (v.getAgeGroup() == null || v.getAgeGroup().getAgeRange() == null) continue;
            if (!"ACTIVE".equalsIgnoreCase(v.getStatus())) continue;
            int[] range = parseAgeRangeToMonths(v.getAgeGroup().getAgeRange());
            if (range == null) continue;
            if (ageMonths >= range[0] && ageMonths <= range[1]) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", v.getId());
                item.put("name", v.getName());
                item.put("ageRange", v.getAgeGroup().getAgeRange());
                item.put("manufacturer", v.getManufacturer() != null ? v.getManufacturer().getName() : null);
                item.put("price", v.getPrice());
                item.put("maxDose", v.getMaxDose());
                out.add(item);
            }
        }

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("queryAge",      age);
        r.put("queryAgeUnit",  isMonth ? "month" : "year");
        r.put("queryAgeMonths", ageMonths);
        r.put("totalFound",    out.size());
        r.put("vaccines",      out);
        if (out.isEmpty()) {
            r.put("message", "Không tìm thấy vaccine phù hợp với độ tuổi " + age + (isMonth ? " tháng" : " tuổi") + ".");
        }
        return r;
    }

    /** Tool 7: liệt kê loại vaccine */
    private Object tool_listVaccineTypes(Map<String, Object> args) {
        List<VaccineType> types = vaccineTypeRepo.findAll();
        List<Map<String, Object>> out = new ArrayList<>();
        for (VaccineType t : types) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", t.getId());
            item.put("typeName", t.getTypeName());
            item.put("description", t.getDescription());
            out.add(item);
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("totalFound", out.size());
        r.put("types", out);
        return r;
    }

    /* ═══════════════════════════════════════════════════════════════════
       PHASE 3 — USER-SPECIFIC TOOLS (yêu cầu đăng nhập)
       Lấy user hiện tại qua UserUtils (đọc SecurityContext do JWT filter set).
       Nếu chưa đăng nhập → trả {requireLogin:true} để AI bảo user login.
       ═══════════════════════════════════════════════════════════════════ */

    private User currentUserOrNull() {
        try { return userUtils.getUserWithAuthority(); }
        catch (Exception e) { return null; }
    }

    private Object requireLoginResponse() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("requireLogin", true);
        r.put("message", "Bạn cần đăng nhập để xem thông tin cá nhân. Vui lòng vào /dang-nhap.");
        return r;
    }

    /** Tool 8: lịch tiêm sắp tới của user đang login */
    private Object tool_getMyUpcomingAppointments(Map<String, Object> args) {
        User me = currentUserOrNull();
        if (me == null) return requireLoginResponse();

        LocalDate today = LocalDate.now();
        java.sql.Date sqlToday = java.sql.Date.valueOf(today);
        List<CustomerSchedule> all = customerScheduleRepo.findAllByUserId(me.getId());

        List<Map<String, Object>> out = new ArrayList<>();
        for (CustomerSchedule cs : all) {
            try {
                if (cs.getVaccineScheduleTime() == null) continue;
                java.sql.Date inject = cs.getVaccineScheduleTime().getInjectDate();
                if (inject == null) continue;
                // Bỏ lịch đã qua
                if (inject.before(sqlToday)) continue;
                // Chỉ lịch active (chưa hủy / chưa tiêm / chưa hoàn thành)
                StatusCustomerSchedule s = cs.getStatusCustomerSchedule();
                if (s == StatusCustomerSchedule.cancelled
                        || s == StatusCustomerSchedule.injected
                        || s == StatusCustomerSchedule.finished
                        || s == StatusCustomerSchedule.not_injected) continue;

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", cs.getId());
                item.put("injectDate", inject.toString());
                item.put("start", cs.getVaccineScheduleTime().getStart() != null ? cs.getVaccineScheduleTime().getStart().toString() : null);
                item.put("end",   cs.getVaccineScheduleTime().getEnd()   != null ? cs.getVaccineScheduleTime().getEnd().toString()   : null);
                VaccineSchedule vs = cs.getVaccineScheduleTime().getVaccineSchedule();
                if (vs != null) {
                    item.put("vaccineName", vs.getVaccine() != null ? vs.getVaccine().getName() : null);
                    item.put("centerName",  vs.getCenter()  != null ? vs.getCenter().getCenterName() : null);
                }
                item.put("status", s != null ? s.name() : null);
                item.put("payStatus", cs.getCustomerSchedulePay() != null ? cs.getCustomerSchedulePay().name() : null);
                item.put("fullName", cs.getFullName());
                out.add(item);
            } catch (Exception ignore) {}
        }
        // Sort theo injectDate ASC
        out.sort(Comparator.comparing(m -> String.valueOf(m.get("injectDate"))));

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("totalFound", out.size());
        r.put("appointments", out);
        if (out.isEmpty()) r.put("message", "Bạn không có lịch tiêm sắp tới nào.");
        return r;
    }

    /** Tool 9: lịch sử tiêm của user */
    private Object tool_getMyVaccinationHistory(Map<String, Object> args) {
        User me = currentUserOrNull();
        if (me == null) return requireLoginResponse();

        List<CustomerSchedule> all = customerScheduleRepo.findAllByUserId(me.getId());
        List<Map<String, Object>> out = new ArrayList<>();
        for (CustomerSchedule cs : all) {
            try {
                StatusCustomerSchedule s = cs.getStatusCustomerSchedule();
                if (s != StatusCustomerSchedule.injected && s != StatusCustomerSchedule.finished) continue;

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", cs.getId());
                item.put("injectDate", cs.getVaccineScheduleTime() != null && cs.getVaccineScheduleTime().getInjectDate() != null
                        ? cs.getVaccineScheduleTime().getInjectDate().toString() : null);
                item.put("completedDate", cs.getCompletedDate() != null ? cs.getCompletedDate().toString() : null);
                VaccineSchedule vs = cs.getVaccineScheduleTime() != null ? cs.getVaccineScheduleTime().getVaccineSchedule() : null;
                if (vs != null) {
                    item.put("vaccineName", vs.getVaccine() != null ? vs.getVaccine().getName() : null);
                    item.put("centerName",  vs.getCenter()  != null ? vs.getCenter().getCenterName() : null);
                }
                item.put("status", s.name());
                item.put("fullName", cs.getFullName());
                out.add(item);
            } catch (Exception ignore) {}
        }
        // Sort mới nhất trước
        out.sort((a, b) -> {
            String da = String.valueOf(a.get("injectDate"));
            String db = String.valueOf(b.get("injectDate"));
            return db.compareTo(da);
        });

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("totalFound", out.size());
        r.put("history", out);
        if (out.isEmpty()) r.put("message", "Bạn chưa có lịch sử tiêm nào trong hệ thống.");
        return r;
    }

    /** Tool 10: gợi ý mũi tiếp theo cho user (dựa vào tuổi + maxDose) */
    private Object tool_getMyRecommendedNext(Map<String, Object> args) {
        User me = currentUserOrNull();
        if (me == null) return requireLoginResponse();

        CustomerProfile profile = null;
        try { profile = customerProfileRepo.findByUser(me.getId()); }
        catch (Exception ignore) {}

        Integer ageMonths = null;
        if (profile != null && profile.getBirthdate() != null) {
            LocalDate dob = profile.getBirthdate().toLocalDate();
            ageMonths = (int) java.time.temporal.ChronoUnit.MONTHS.between(dob, LocalDate.now());
        }

        // Tính số mũi đã tiêm theo từng vaccine
        Map<Long, Integer> dosesByVaccine = new HashMap<>();
        Map<Long, String>  vaccineNames   = new HashMap<>();
        List<CustomerSchedule> myAll = customerScheduleRepo.findAllByUserId(me.getId());
        for (CustomerSchedule cs : myAll) {
            StatusCustomerSchedule s = cs.getStatusCustomerSchedule();
            if (s != StatusCustomerSchedule.injected && s != StatusCustomerSchedule.finished) continue;
            try {
                Vaccine v = cs.getVaccineScheduleTime().getVaccineSchedule().getVaccine();
                if (v == null) continue;
                dosesByVaccine.merge(v.getId(), 1, Integer::sum);
                vaccineNames.putIfAbsent(v.getId(), v.getName());
            } catch (Exception ignore) {}
        }

        List<Map<String, Object>> recommended = new ArrayList<>();

        // (a) Vaccine đã tiêm nhưng chưa đủ maxDose
        for (Map.Entry<Long, Integer> e : dosesByVaccine.entrySet()) {
            try {
                Vaccine v = vaccineRepo.findById(e.getKey()).orElse(null);
                if (v == null || v.getMaxDose() == null) continue;
                int done = e.getValue();
                if (done < v.getMaxDose()) {
                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("vaccineId", v.getId());
                    r.put("vaccineName", v.getName());
                    r.put("dosesCompleted", done);
                    r.put("maxDose", v.getMaxDose());
                    r.put("dosesRemaining", v.getMaxDose() - done);
                    r.put("minIntervalMonths", v.getMinIntervalMonths());
                    r.put("reason", "Đã tiêm " + done + "/" + v.getMaxDose() + " mũi, cần tiêm tiếp.");
                    r.put("priority", "high");
                    recommended.add(r);
                }
            } catch (Exception ignore) {}
        }

        // (b) Vaccine chưa tiêm + phù hợp tuổi
        if (ageMonths != null) {
            for (Vaccine v : vaccineRepo.findAll()) {
                if (!"ACTIVE".equalsIgnoreCase(v.getStatus())) continue;
                if (dosesByVaccine.containsKey(v.getId())) continue;        // đã tiêm rồi → bỏ
                if (v.getAgeGroup() == null || v.getAgeGroup().getAgeRange() == null) continue;
                int[] range = parseAgeRangeToMonths(v.getAgeGroup().getAgeRange());
                if (range == null) continue;
                if (ageMonths >= range[0] && ageMonths <= range[1]) {
                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("vaccineId", v.getId());
                    r.put("vaccineName", v.getName());
                    r.put("ageRange", v.getAgeGroup().getAgeRange());
                    r.put("maxDose", v.getMaxDose());
                    r.put("reason", "Phù hợp độ tuổi và bạn chưa tiêm.");
                    r.put("priority", "normal");
                    recommended.add(r);
                    if (recommended.size() >= 20) break;
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ageMonths", ageMonths);
        result.put("hasProfile", profile != null);
        result.put("totalRecommended", recommended.size());
        result.put("recommendations", recommended);
        if (ageMonths == null) {
            result.put("note", "Chưa có ngày sinh trong profile — chỉ gợi ý dựa theo lịch sử tiêm. Cập nhật profile tại /thong-tin-ca-nhan để gợi ý chính xác hơn.");
        }
        if (recommended.isEmpty()) {
            result.put("message", "Hiện chưa có gợi ý nào nổi bật. Bạn có thể vào /dang-ky-tiem-chung để xem toàn bộ vaccine.");
        }
        return result;
    }

    /** Tool 11: giấy chứng nhận của user */
    private Object tool_getMyCertificates(Map<String, Object> args) {
        User me = currentUserOrNull();
        if (me == null) return requireLoginResponse();

        // Cert tìm qua customer_schedule_id thuộc user
        List<CustomerSchedule> myAll = customerScheduleRepo.findAllByUserId(me.getId());
        List<Map<String, Object>> out = new ArrayList<>();
        for (CustomerSchedule cs : myAll) {
            try {
                var certOpt = certRepo.findByCustomerScheduleId(cs.getId());
                if (certOpt.isEmpty()) continue;
                VaccinationCertificate cert = certOpt.get();
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", cert.getId());
                item.put("serialNo", cert.getSerialNo());
                item.put("vaccineName", cert.getVaccineName());
                item.put("doseNumber", cert.getDoseNumber());
                item.put("totalDoses", cert.getTotalDoses());
                item.put("centerName", cert.getCenterName());
                item.put("injectionDate", cert.getInjectionDate() != null ? cert.getInjectionDate().toString() : null);
                item.put("issuedDate",    cert.getIssuedDate()    != null ? cert.getIssuedDate().toString()    : null);
                item.put("revoked", Boolean.TRUE.equals(cert.getRevoked()));
                if (Boolean.TRUE.equals(cert.getRevoked())) {
                    item.put("revokedReason", cert.getRevokedReason());
                }
                item.put("downloadHint", "Vào /lich-da-dang-ky → mục có 'Tải PDF'.");
                out.add(item);
            } catch (Exception ignore) {}
        }
        // Sort theo issuedDate desc
        out.sort((a, b) -> String.valueOf(b.get("issuedDate")).compareTo(String.valueOf(a.get("issuedDate"))));

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("totalFound", out.size());
        r.put("certificates", out);
        if (out.isEmpty()) r.put("message", "Bạn chưa có giấy chứng nhận nào. Giấy được cấp tự động sau khi tiêm xong.");
        return r;
    }

    /* ═══════════════════════════════════════════════════════════════════
       HELPERS riêng cho Phase 2/3
       ═══════════════════════════════════════════════════════════════════ */

    /**
     * Parse string ageRange tiếng Việt thành range [min, max] (đơn vị: THÁNG).
     * Hỗ trợ các format phổ biến:
     *   "0-1 tháng"           → [0, 1]
     *   "2-6 tháng"           → [2, 6]
     *   "9-12 tháng"          → [9, 12]
     *   "1-6 tuổi"            → [12, 72]
     *   "9-14 tuổi"           → [108, 168]
     *   "Người lớn"           → [216, 780]   (18–65 tuổi)
     *   "≥65 tuổi" / "Trên 65 tuổi" → [780, 1440]
     * Trả null nếu không parse được.
     */
    private int[] parseAgeRangeToMonths(String raw) {
        if (raw == null) return null;
        String s = raw.toLowerCase().trim().replace("≥", ">=").replace("≤", "<=");
        try {
            // "Người lớn"
            if (s.contains("người lớn") && !s.matches(".*\\d.*")) return new int[]{216, 780};

            // Pattern "<n>-<m> tháng" hoặc "<n>-<m> tuổi"
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("(\\d+)\\s*[-–]\\s*(\\d+)\\s*(tháng|tuổi|năm)").matcher(s);
            if (m.find()) {
                int lo = Integer.parseInt(m.group(1));
                int hi = Integer.parseInt(m.group(2));
                String unit = m.group(3);
                if ("tháng".equals(unit)) return new int[]{lo, hi};
                return new int[]{lo * 12, hi * 12};
            }

            // Pattern ">= <n> tuổi" hoặc "trên <n> tuổi"
            m = java.util.regex.Pattern.compile("(?:>=|trên|từ)\\s*(\\d+)\\s*(tháng|tuổi|năm)").matcher(s);
            if (m.find()) {
                int lo = Integer.parseInt(m.group(1));
                String unit = m.group(2);
                int loMonths = "tháng".equals(unit) ? lo : lo * 12;
                return new int[]{loMonths, 1440};   // → 120 tuổi
            }

            // Pattern "<n> tháng" hoặc "<n> tuổi" (1 con số duy nhất)
            m = java.util.regex.Pattern.compile("(\\d+)\\s*(tháng|tuổi|năm)").matcher(s);
            if (m.find()) {
                int n = Integer.parseInt(m.group(1));
                String unit = m.group(2);
                int months = "tháng".equals(unit) ? n : n * 12;
                return new int[]{months, months};
            }
        } catch (Exception ignore) {}
        return null;
    }

    private String joinNonEmpty(String sep, String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p == null || p.trim().isEmpty()) continue;
            if (sb.length() > 0) sb.append(sep);
            sb.append(p.trim());
        }
        return sb.toString();
    }

    /* ═══════════════════════════════════════════════════════════════════
       CONVERSATION HISTORY (in-memory per session)
       ═══════════════════════════════════════════════════════════════════ */
    private List<Map<String, Object>> getHistory(String sessionId) {
        Deque<Map<String, Object>> q = sessionHistory.get(sessionId);
        if (q == null) return Collections.emptyList();
        return new ArrayList<>(q);
    }

    private void saveToHistory(String sessionId, String userMsg, String assistantMsg) {
        Deque<Map<String, Object>> q = sessionHistory.computeIfAbsent(sessionId, k -> new ArrayDeque<>());
        synchronized (q) {
            q.addLast(msg("user", userMsg));
            q.addLast(msg("assistant", assistantMsg));
            // Giới hạn N message gần nhất (mỗi round = user+assistant = 2 messages)
            while (q.size() > historyMax * 2) q.pollFirst();
        }
    }

    public void clearHistory(String sessionId) {
        if (sessionId != null) sessionHistory.remove(sessionId);
    }

    /* ═══════════════════════════════════════════════════════════════════
       HELPERS
       ═══════════════════════════════════════════════════════════════════ */
    private static Map<String, Object> msg(String role, String content) {
        Map<String, Object> m = new HashMap<>();
        m.put("role", role);
        m.put("content", content);
        return m;
    }

    /** Build 1 tool definition (OpenAI/Groq format) */
    private static Map<String, Object> tool(String name, String description, Map<String, Object> params) {
        Map<String, Object> fn = new LinkedHashMap<>();
        fn.put("name", name);
        fn.put("description", description);
        fn.put("parameters", params);

        Map<String, Object> outer = new LinkedHashMap<>();
        outer.put("type", "function");
        outer.put("function", fn);
        return outer;
    }

    @SafeVarargs
    private static Map<String, Object> paramObj(Map.Entry<String, Map<String, Object>>... fields) {
        Map<String, Object> props = new LinkedHashMap<>();
        for (var e : fields) props.put(e.getKey(), e.getValue());

        Map<String, Object> obj = new LinkedHashMap<>();
        obj.put("type", "object");
        obj.put("properties", props);
        obj.put("required", new ArrayList<>());
        return obj;
    }

    private static Map.Entry<String, Map<String, Object>> paramStr(String name, String description) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("type", "string");
        p.put("description", description);
        return Map.entry(name, p);
    }

    private Map<String, Object> parseArgs(String argsJson) {
        try {
            if (argsJson == null || argsJson.isBlank() || "null".equals(argsJson)) return new HashMap<>();
            return objectMapper.readValue(argsJson, Map.class);
        } catch (Exception e) {
            log.warn("[Groq] failed to parse tool args: {}", argsJson);
            return new HashMap<>();
        }
    }

    private static String strArg(Map<String, Object> args, String key) {
        Object v = args.get(key);
        if (v == null) return null;
        String s = String.valueOf(v).trim();
        if (s.isEmpty() || "null".equalsIgnoreCase(s)) return null;
        return s;
    }

    private static LocalDate dateArg(Map<String, Object> args, String key) {
        String s = strArg(args, key);
        if (s == null) return null;
        try { return LocalDate.parse(s); } catch (Exception e) { return null; }
    }

    private static String truncate(String s, int max) {
        if (s == null) return "null";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
