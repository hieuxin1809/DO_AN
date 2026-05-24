package com.web.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.web.entity.Vaccine;
import com.web.entity.VaccineSchedule;
import com.web.repository.VaccineRepository;
import com.web.repository.VaccineScheduleRepository;
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

    private final ObjectMapper objectMapper = new ObjectMapper();
    /** Lịch sử hội thoại theo session — in-memory, không persist. */
    private final Map<String, Deque<Map<String, Object>>> sessionHistory = new ConcurrentHashMap<>();

    private static final String SYSTEM_PROMPT =
        // ── IDENTITY ────────────────────────────────────────────────────────
        "Bạn là iVax — trợ lý AI của iVaccine, hệ thống đặt lịch tiêm chủng trực tuyến tại Việt Nam. " +
        "Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, đúng trọng tâm. Dùng gạch đầu dòng khi liệt kê. " +
        "Không dùng markdown heading (##).\n\n" +

        // ── TOOL CALLING ───────────────────────────────────────────────────
        "=== QUY TẮC DÙNG TOOL ===\n" +
        "Khi user hỏi về DỮ LIỆU HIỆN CÓ TRONG HỆ THỐNG (lịch tiêm sắp tới, danh sách vaccine, giá, ...), " +
        "BẮT BUỘC dùng tool tương ứng để query data live. TUYỆT ĐỐI KHÔNG bịa data.\n" +
        "Nếu user hỏi câu kiến thức chung (vaccine gì phòng bệnh gì, tác dụng phụ, độ tuổi tiêm chuẩn) → trả lời thẳng bằng kiến thức bên dưới.\n\n" +

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

        return tools;
    }

    /* ═══════════════════════════════════════════════════════════════════
       TOOL EXECUTION — switch theo name, gọi repo, trả Object JSON-serializable
       ═══════════════════════════════════════════════════════════════════ */
    private Object executeTool(String name, Map<String, Object> args) {
        try {
            switch (name) {
                case "listUpcomingSchedules": return tool_listUpcomingSchedules(args);
                case "searchVaccines":        return tool_searchVaccines(args);
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
