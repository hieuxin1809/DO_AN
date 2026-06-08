# iVax — Tài liệu kỹ thuật AI Trợ lý Tiêm chủng

> Tài liệu mô tả chi tiết cách hoạt động của AI trợ lý "iVax" tích hợp trong hệ thống iVaccine. Dùng cho mục đích defend luận văn, đào tạo developer mới, hoặc onboarding.

---

## 1. Tổng quan

### 1.1 Mục tiêu

**iVax** là chatbot AI tích hợp vào website iVaccine, trả lời câu hỏi của khách hàng về:

- Thông tin vaccine (giá, NSX, độ tuổi, số mũi, khoảng cách giữa các mũi)
- Trung tâm tiêm chủng (địa chỉ, danh sách theo khu vực)
- Lịch tiêm đang mở (theo trung tâm, theo ngày, slot còn trống)
- **Dữ liệu cá nhân** của user đang đăng nhập (lịch sắp tới, lịch sử tiêm, giấy chứng nhận, gợi ý mũi kế tiếp)
- Kiến thức tiêm chủng tổng quát (vaccine theo độ tuổi, phản ứng sau tiêm, khi nào cần cấp cứu)

### 1.2 Điểm khác biệt cốt lõi

Không phải chatbot "kiểu trả lời theo template" hay "gọi LLM rồi in ra". iVax dùng kỹ thuật **Function Calling (Tool Calling)** — LLM **tự quyết định gọi hàm Java backend** để query database thật trước khi trả lời.

Điều này giúp:
- **Không hallucinate**: mọi giá tiền, ngày tiêm, slot, hồ sơ đều fetch trực tiếp từ MySQL
- **Cá nhân hoá**: hiểu được "lịch của TÔI" qua JWT
- **Live data**: vừa update DB → câu trả lời tiếp theo dùng data mới

### 1.3 Tech stack

| Thành phần | Công nghệ |
|---|---|
| LLM Provider | **Groq Cloud** (free tier) |
| Model | `llama-3.3-70b-versatile` (70 tỉ tham số, Meta phát hành 12/2024) |
| API protocol | OpenAI-compatible Chat Completions API |
| HTTP client | Spring `RestTemplate` |
| JSON parsing | Jackson `ObjectMapper` |
| Backend framework | Spring Boot 2.7.12 |
| Frontend widget | React + native `fetch` |
| Session storage | In-memory `ConcurrentHashMap` (per session) |

---

## 2. Kiến trúc tổng thể

### 2.1 Sơ đồ 3 tầng

```
┌────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                            │
│  - Widget AIChatbot.js (floating ở góc phải mọi trang)          │
│  - State: open/closed, messages[], sessionId, isLoading         │
│  - POST /api/chat-ai/ask kèm header Authorization: Bearer <JWT> │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTP/JSON
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                BACKEND (Spring Boot @ :8080)                    │
│                                                                  │
│  ChatAIApi.java                                                  │
│    └─ @PostMapping("/api/chat-ai/ask")                          │
│       └─ groqService.chatWithAI(sessionId, message)             │
│                                                                  │
│  GroqService.java  (orchestrator chính, ~700 dòng)              │
│    ├─ SYSTEM_PROMPT (định danh, quy tắc, kiến thức nền)         │
│    ├─ buildTools() — định nghĩa 11 tool theo JSON Schema        │
│    ├─ chatWithAI()  — vòng lặp gọi Groq + execute tool          │
│    ├─ executeTool() — switch case 11 tool                       │
│    ├─ tool_*()      — 11 hàm thực thi tool                      │
│    └─ saveToHistory/getHistory — quản lý conversation memory    │
│                                                                  │
│  Repositories     — query MySQL (CustomerSchedule, Vaccine, …)  │
│  UserUtils        — đọc SecurityContextHolder để biết user      │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌────────────────────────────────────────────────────────────────┐
│         Groq Cloud API (api.groq.com)                           │
│  - Endpoint: /openai/v1/chat/completions                        │
│  - Auth: Bearer GROQ_API_KEY                                    │
│  - Model: llama-3.3-70b-versatile                               │
│  - Tính năng: function calling theo chuẩn OpenAI                │
│  - Hardware: LPU (Language Processing Unit) — nhanh hơn GPU     │
│  - Throughput: ~300 tokens/giây                                 │
│  - Free tier: 30 requests/phút                                  │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Cấu hình

File `server/src/main/resources/application.properties`:

```properties
groq.api-key=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
groq.api-url=https://api.groq.com/openai/v1/chat/completions
groq.model=llama-3.3-70b-versatile
groq.history-max=10
```

Inject qua `@Value` vào `GroqService`.

---

## 3. Vòng lặp Function Calling

### 3.1 Pseudo-code

```
INPUT:  sessionId, userMessage
OUTPUT: assistantReply (string)

messages = [SYSTEM_PROMPT, ...history(sessionId), userMessage]

FOR round IN 1..MAX_ROUNDS (=3):
    response = callGroq(messages, withTools=true)
    assistantMsg = response.choices[0].message
    messages.append(assistantMsg)

    IF assistantMsg.tool_calls IS EMPTY:
        # LLM đã có câu trả lời cuối
        finalAnswer = assistantMsg.content
        BREAK

    FOR EACH toolCall IN assistantMsg.tool_calls:
        name = toolCall.function.name
        args = parseJson(toolCall.function.arguments)
        result = executeTool(name, args)  # gọi DB
        messages.append({
            role: "tool",
            tool_call_id: toolCall.id,
            content: jsonStringify(result)
        })
    # Lặp lại: gửi tool results về cho LLM để tổng hợp

saveToHistory(sessionId, userMessage, finalAnswer)
RETURN finalAnswer
```

### 3.2 Ví dụ cụ thể — user hỏi "Lịch tiêm của tôi"

**Lượt 1**: BE gửi tới Groq

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    { "role": "system", "content": "Bạn là iVax... TUYỆT ĐỐI KHÔNG bịa data..." },
    { "role": "user",   "content": "Lịch tiêm của tôi đâu rồi?" }
  ],
  "tools": [
    { "type": "function", "function": { "name": "getMyUpcomingAppointments", ... } },
    { "type": "function", "function": { "name": "listUpcomingSchedules", ... } },
    ... (11 tools)
  ],
  "tool_choice": "auto"
}
```

**Lượt 1**: Groq trả về

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "getMyUpcomingAppointments",
          "arguments": "{}"
        }
      }]
    }
  }]
}
```

→ LLM **chọn đúng tool** vì system prompt dạy "khi user nói 'của tôi' → dùng getMy*".

**BE execute tool**: gọi `tool_getMyUpcomingAppointments()` → query `CustomerScheduleRepository.findAllByUserId(currentUser.id)` → filter status pending/confirmed + injectDate >= today → trả về:

```json
{
  "totalFound": 2,
  "appointments": [
    {
      "id": 42,
      "injectDate": "2026-05-31",
      "start": "08:00", "end": "09:00",
      "vaccineName": "Hexaxim (6in1)",
      "centerName": "VaxFUDA Cầu Giấy",
      "status": "confirmed",
      "payStatus": "THANH_TOAN_PAYPAL"
    },
    {
      "id": 47,
      "injectDate": "2026-06-15",
      ...
    }
  ]
}
```

**Lượt 2**: BE gửi tiếp về Groq (kèm tool result)

```json
{
  "messages": [
    { "role": "system", ... },
    { "role": "user", "content": "Lịch tiêm của tôi đâu rồi?" },
    { "role": "assistant", "tool_calls": [...] },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "content": "{\"totalFound\": 2, \"appointments\": [...]}"
    }
  ],
  "tools": [...]
}
```

**Lượt 2**: Groq tổng hợp thành câu trả lời

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Bạn có 2 lịch tiêm sắp tới:\n\n• 31/05/2026, 08:00–09:00 — Hexaxim (6in1) tại VaxFUDA Cầu Giấy (đã duyệt, đã thanh toán)\n• 15/06/2026, ... \n\nNhớ đến trung tâm đúng giờ + mang theo CCCD nhé!"
    }
  }]
}
```

→ BE thấy không có `tool_calls` nữa → break vòng lặp → trả `content` về FE.

### 3.3 Tại sao max 3 round?

- **Round 1**: LLM nhìn câu hỏi → quyết định gọi tool nào
- **Round 2**: Sau khi nhận tool result → tổng hợp câu trả lời
- **Round 3**: Trường hợp LLM cần chain nhiều tool (vd: tìm vaccine → lấy ID → check slot)

Quá 3 round → coi như LLM bị loop, return câu trả lời mặc định "Xin lỗi, tôi không thể trả lời...". Hardcoded `MAX_ROUNDS = 3` trong `GroqService.chatWithAI()`.

---

## 4. System Prompt

Là "constitution" của bot. Dạy LLM tính cách + quy tắc + kiến thức nền + cách dùng tool. Đoạn quan trọng nhất:

```
Bạn là iVax — trợ lý AI của iVaccine, hệ thống đặt lịch tiêm chủng tại Việt Nam.
Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn. Dùng gạch đầu dòng khi liệt kê.
Không dùng markdown heading (##).

=== QUY TẮC DÙNG TOOL ===
Khi user hỏi về DỮ LIỆU HIỆN CÓ TRONG HỆ THỐNG (lịch, vaccine, giá, ...),
BẮT BUỘC dùng tool tương ứng để query data live. TUYỆT ĐỐI KHÔNG bịa data.
Nếu user hỏi câu kiến thức chung (vaccine gì phòng bệnh gì, tác dụng phụ) → trả lời thẳng.
Khi user nói "tôi", "của tôi", "lịch tôi đã đặt" → DÙNG tool 'getMy*'.
Nếu tool trả về requireLogin=true → bảo user vui lòng đăng nhập.

=== QUY TẮC BẮT BUỘC ===
1. iVaccine là hệ thống TRỰC TUYẾN — mọi thao tác trên website.
2. KHÔNG yêu cầu khách "đến trực tiếp" hay "gọi điện" để đổi/hủy lịch.
3. KHÔNG chẩn đoán bệnh hay kê đơn thuốc — chỉ tư vấn vaccine phòng ngừa.
4. Cấp cứu → gọi 115 ngay.
5. Bạn KHÔNG thể đặt lịch giúp khách. Nếu khách muốn đặt, hướng dẫn /dang-ky-tiem-chung.

=== THÔNG TIN HỆ THỐNG ===
Website: ivaccine.vn | Hotline: 0342.046.981 | Thanh toán: VNPay, PayPal, tiền mặt.
Đặt lịch: /dang-ky-tiem-chung | Lịch của tôi: /lich-da-dang-ky

=== KIẾN THỨC VACCINE NGẮN GỌN ===
- 0–1 tháng: Viêm gan B, BCG (lao)
- 2–6 tháng: 5in1/6in1, phế cầu, rotavirus
- 9–12 tháng: MMR, thủy đậu, viêm não Nhật Bản
- 1–6 tuổi: Nhắc MMR, cúm hàng năm, viêm gan A
- 9–14 tuổi: HPV (2–3 mũi)
- Người lớn: Cúm, viêm gan A+B, Tdap, HPV (đến 45 tuổi)
- ≥65 tuổi: Cúm, phế cầu, zona

SAU TIÊM bình thường: đau/sưng chỗ tiêm, sốt nhẹ <38.5°C → chườm lạnh, paracetamol, nghỉ ngơi, ở lại 30 phút.
CẦN CẤP CỨU: sốt >39°C kéo dài, khó thở, phát ban toàn thân → gọi 115.
```

→ Prompt này được prepend mọi conversation. Mỗi turn LLM "đọc lại" nguyên cái này.

---

## 5. 11 Tool đang triển khai

### 5.1 Bảng tổng hợp

| # | Tool name | Public/Auth | Mô tả ngắn |
|---|---|---|---|
| 1 | `listUpcomingSchedules` | Public | Đợt tiêm đang mở (filter vaccine/center/date) |
| 2 | `searchVaccines` | Public | Tìm vaccine theo keyword |
| 3 | `getVaccineDetails` | Public | Chi tiết 1 vaccine (maxDose, NSX, hạn) |
| 4 | `findCenters` | Public | Tìm trung tâm theo địa chỉ |
| 5 | `checkSlotsRemaining` | Public | Đếm slot còn trống của 1 khung giờ |
| 6 | `getVaccinesForAge` | Public | Vaccine phù hợp độ tuổi |
| 7 | `listVaccineTypes` | Public | Danh sách loại vaccine |
| 8 | `getMyUpcomingAppointments` | **JWT** | Lịch sắp tới của user đang login |
| 9 | `getMyVaccinationHistory` | **JWT** | Lịch sử tiêm đã hoàn tất |
| 10 | `getMyRecommendedNext` | **JWT** | Gợi ý mũi tiếp theo (logic tự xây) |
| 11 | `getMyCertificates` | **JWT** | Giấy chứng nhận của user |

### 5.2 Schema tool — ví dụ tool #6

Mỗi tool có JSON Schema để LLM biết khi nào gọi + tham số gì:

```java
tools.add(tool(
    "getVaccinesForAge",
    "Liệt kê các vaccine PHÙ HỢP với một độ tuổi cụ thể. " +
    "Dùng khi user hỏi: 'con tôi 3 tháng nên tiêm vaccine gì?', " +
    "'người lớn 30 tuổi tiêm gì?', 'trẻ 12 tuổi tiêm HPV được không?'.",
    paramObj(
        paramStr("age",     "Số tuổi/tháng. VD: '6', '12', '30'."),
        paramStr("ageUnit", "'month' nếu là tháng tuổi, 'year' nếu là năm tuổi. Mặc định 'year'.")
    )
));
```

→ Render thành JSON:
```json
{
  "type": "function",
  "function": {
    "name": "getVaccinesForAge",
    "description": "Liệt kê các vaccine PHÙ HỢP với một độ tuổi cụ thể. Dùng khi user hỏi: ...",
    "parameters": {
      "type": "object",
      "properties": {
        "age":     { "type": "string", "description": "Số tuổi/tháng. VD: '6', '12', '30'." },
        "ageUnit": { "type": "string", "description": "'month' nếu là tháng tuổi, 'year' nếu là năm tuổi. Mặc định 'year'." }
      },
      "required": []
    }
  }
}
```

### 5.3 Logic tool #10 (đáng nhấn mạnh — thuật toán tự xây)

`getMyRecommendedNext` — gợi ý mũi tiếp theo cho user:

```java
public Object tool_getMyRecommendedNext(Map<String, Object> args) {
    User me = currentUserOrNull();
    if (me == null) return requireLoginResponse();

    // 1. Tính tuổi theo tháng từ profile.birthdate
    CustomerProfile profile = customerProfileRepo.findByUser(me.getId());
    Integer ageMonths = null;
    if (profile != null && profile.getBirthdate() != null) {
        LocalDate dob = profile.getBirthdate().toLocalDate();
        ageMonths = (int) ChronoUnit.MONTHS.between(dob, LocalDate.now());
    }

    // 2. Đếm số mũi đã tiêm theo từng vaccine
    Map<Long, Integer> dosesByVaccine = new HashMap<>();
    for (CustomerSchedule cs : customerScheduleRepo.findAllByUserId(me.getId())) {
        if (cs.status != injected && cs.status != finished) continue;
        Vaccine v = cs.vaccineScheduleTime.vaccineSchedule.vaccine;
        dosesByVaccine.merge(v.getId(), 1, Integer::sum);
    }

    List<Map<String, Object>> recommended = new ArrayList<>();

    // 3. Vaccine đã tiêm dở dang (chưa đủ maxDose) → priority high
    for (entry in dosesByVaccine) {
        Vaccine v = vaccineRepo.findById(entry.key);
        if (v.maxDose != null && entry.value < v.maxDose) {
            recommended.add({
                vaccineName: v.name,
                dosesCompleted: entry.value,
                dosesRemaining: v.maxDose - entry.value,
                reason: "Đã tiêm N/M mũi, cần tiêm tiếp.",
                priority: "high"
            });
        }
    }

    // 4. Vaccine chưa tiêm + phù hợp độ tuổi → priority normal
    if (ageMonths != null) {
        for (Vaccine v : vaccineRepo.findAll()) {
            if (dosesByVaccine.containsKey(v.id)) continue;  // skip đã tiêm
            int[] range = parseAgeRangeToMonths(v.ageGroup.ageRange);
            if (ageMonths >= range[0] && ageMonths <= range[1]) {
                recommended.add({
                    vaccineName: v.name,
                    ageRange: v.ageGroup.ageRange,
                    reason: "Phù hợp độ tuổi và bạn chưa tiêm.",
                    priority: "normal"
                });
            }
        }
    }

    return { ageMonths, totalRecommended: recommended.size(), recommendations };
}
```

→ Đây là **engine gợi ý y tế đơn giản** dựa 3 yếu tố: tuổi (từ profile), lịch sử tiêm (từ customer_schedule), schema vaccine (maxDose + ageGroup). Defend được như "rule-based recommendation system".

**Helper `parseAgeRangeToMonths()`** dùng regex để parse các chuỗi VN:
- `"0-1 tháng"` → `[0, 1]`
- `"1-6 tuổi"` → `[12, 72]`
- `"Người lớn"` → `[216, 780]` (18-65 tuổi)
- `"≥65 tuổi"` → `[780, 1440]`

---

## 6. Quản lý Conversation History

### 6.1 Cơ chế in-memory

```java
private final Map<String, Deque<Map<String, Object>>> sessionHistory = new ConcurrentHashMap<>();
```

- Key: `sessionId` (FE generate UUID, lưu trong `localStorage`)
- Value: deque các message gần nhất

### 6.2 Giới hạn

```java
@Value("${groq.history-max:10}") int historyMax;  // default 10 cặp

private void saveToHistory(String sessionId, String userMsg, String assistantMsg) {
    Deque<Map<String, Object>> q = sessionHistory.computeIfAbsent(sessionId, k -> new ArrayDeque<>());
    synchronized (q) {
        q.addLast(msg("user", userMsg));
        q.addLast(msg("assistant", assistantMsg));
        // Cắt: giữ N cặp gần nhất (mỗi cặp = 2 messages)
        while (q.size() > historyMax * 2) q.pollFirst();
    }
}
```

→ Mỗi session nhớ 10 cặp Q-A gần nhất, đủ để hiểu context "thế còn cái kia?" mà không quá nhiều token.

### 6.3 Endpoint clear history

```
POST /api/chat-ai/clear  body: { sessionId: "..." }
```

FE gọi khi user reset chat hoặc bấm "tạo cuộc trò chuyện mới".

### 6.4 Vì sao in-memory?

- **Đơn giản**: không cần thêm bảng DB, không lo migration
- **Đủ cho demo**: thesis project không cần persistence cross-server
- **Trade-off đã chấp nhận**: restart Spring Boot → mất history. Production thật sẽ chuyển sang Redis.

---

## 7. JWT-aware Tools (Phase 3 — đáng defend nhất)

### 7.1 Cơ chế

`/api/chat-ai/ask` là endpoint `public` (security cho phép mọi role), nhưng filter `JwtAuthenticationFilter` vẫn chạy với mọi request. Nếu request có `Authorization: Bearer <valid_token>`, filter set `SecurityContextHolder.Authentication` → `UserUtils.getUserWithAuthority()` trả về `User` entity.

### 7.2 Helper trong GroqService

```java
private User currentUserOrNull() {
    try { return userUtils.getUserWithAuthority(); }
    catch (Exception e) { return null; }
}

private Object requireLoginResponse() {
    return Map.of(
        "requireLogin", true,
        "message", "Bạn cần đăng nhập để xem thông tin cá nhân. Vui lòng vào /dang-nhap."
    );
}
```

### 7.3 Pattern trong mỗi tool getMy*

```java
private Object tool_getMyUpcomingAppointments(Map<String, Object> args) {
    User me = currentUserOrNull();
    if (me == null) return requireLoginResponse();
    // ... query DB với me.getId()
}
```

→ LLM nhận `{requireLogin: true, message: "..."}` → diễn giải lại cho user: "Bạn cần đăng nhập để xem lịch tiêm của mình. Truy cập /dang-nhap nhé."

### 7.4 FE đính kèm JWT

`AIChatbot.js`:

```js
const tok = localStorage.getItem('token');
const headers = { 'Content-Type': 'application/json' };
if (tok) headers['Authorization'] = `Bearer ${tok}`;

await fetch('http://localhost:8080/api/chat-ai/ask', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: userMsg, sessionId: getSessionId() })
});
```

→ Nếu user login → gửi token → backend biết user nào đang hỏi. Nếu chưa login → không gửi → tools getMy* trả requireLogin.

---

## 8. Error Handling

3 tầng bảo vệ trong `chatWithAI()`:

### Tầng 1: Lỗi Groq API (rate limit, network)

```java
try {
    response = callGroq(messages, true);
} catch (HttpClientErrorException ex) {
    String body = ex.getResponseBodyAsString();
    if (body != null && body.contains("tool_use_failed")) {
        // Model fail format tool call → retry không tools
        log.warn("[Groq] tool_use_failed, fallback gọi không tools");
        response = callGroq(messages, false);
    } else {
        throw ex;  // các lỗi khác bubble up
    }
}
```

→ Đây là trường hợp model nhỏ đôi khi output JSON tool_calls sai format → fallback không tool để vẫn có câu trả lời (dù mất khả năng query DB).

### Tầng 2: Lỗi execute tool

```java
private Object executeTool(String name, Map<String, Object> args) {
    try {
        switch (name) { ... }
    } catch (Exception e) {
        log.error("[Groq Tool] Error executing {}: {}", name, e.getMessage(), e);
        return Map.of("error", "Không thể lấy dữ liệu, vui lòng thử lại");
    }
}
```

→ Tool throw exception → trả error JSON về LLM thay vì kill conversation.

### Tầng 3: Catch-all

```java
try {
    // toàn bộ logic chatWithAI
} catch (Exception e) {
    log.error("[Groq] Error: {}", e.getMessage(), e);
    return "Xin lỗi, hiện tại tôi không thể trả lời. Vui lòng thử lại sau nhé!";
}
```

→ User luôn nhận được câu trả lời, dù backend lỗi nghiêm trọng.

---

## 9. Flow demo cho thầy / hội đồng

### 9.1 Demo 1 — Public tool (không login)

> **User**: "Vaccine HPV có những loại nào, giá bao nhiêu?"
>
> **Backend flow**:
> 1. LLM nhận câu hỏi → quyết định gọi `searchVaccines({keyword: "HPV"})`
> 2. BE query `VaccineRepository.findByParam("%HPV%", ...)`
> 3. Trả về 2 vaccine: Gardasil 9 (4.5M), Cervarix (2.8M)
> 4. LLM tổng hợp: "iVaccine hiện có 2 loại vaccine HPV:\n• Gardasil 9 — 4.500.000 đ (MSD)\n• Cervarix — 2.800.000 đ (GSK)\nBạn muốn đặt lịch tiêm không?"

### 9.2 Demo 2 — JWT-aware tool

> **User (đã login)**: "Tôi nên tiêm gì tiếp theo?"
>
> **Backend flow**:
> 1. LLM gọi `getMyRecommendedNext({})`
> 2. BE: đọc JWT → User id=42 → profile birthdate 2024-01-15 → tuổi 16 tháng
> 3. Đếm đã tiêm: 6in1 (3 mũi), maxDose=4 → còn 1 mũi
> 4. Quét vaccine phù hợp 16 tháng: MMR, thủy đậu, JEV
> 5. Trả về 1 high-priority + 3 normal
> 6. LLM: "Ưu tiên cao nhất: bạn còn 1 mũi 6in1 (đã tiêm 3/4).\n\nNgoài ra phù hợp độ tuổi:\n• MMR (sởi-quai bị-rubella)\n• Thủy đậu\n• Viêm não Nhật Bản\n\nĐặt lịch tại /dang-ky-tiem-chung nhé!"

### 9.3 Demo 3 — Chain nhiều tool

> **User**: "Tìm slot tiêm cúm ở Cầu Giấy tuần tới"
>
> **Backend flow** (2 round):
> 1. LLM gọi đồng thời 2 tool: `listUpcomingSchedules({vaccineName: "cúm", centerName: "Cầu Giấy"})` + `findCenters({district: "Cầu Giấy"})`
> 2. BE execute cả 2 → trả về danh sách đợt + center
> 3. LLM tổng hợp: "Tại Cầu Giấy có 2 trung tâm:\n• VaxFUDA Cầu Giấy\n• ...\nĐang có 5 lịch tiêm Cúm Mùa tuần tới..."

### 9.4 Demo 4 — Câu kiến thức chung (không gọi tool)

> **User**: "Sau tiêm mà bị sốt 38°C có sao không?"
>
> **Backend flow**:
> 1. LLM không gọi tool (vì system prompt có sẵn kiến thức)
> 2. Trả về luôn từ trí nhớ + system prompt: "Sốt 38°C sau tiêm là phản ứng bình thường. Bạn có thể:\n• Chườm khăn ấm\n• Uống paracetamol theo cân nặng\n• Nghỉ ngơi, uống nhiều nước\nNếu sốt >39°C kéo dài hoặc khó thở → gọi 115 ngay."

→ Phân biệt được "câu cần data" vs "câu kiến thức" dựa vào system prompt.

---

## 10. Files liên quan (cây thư mục)

```
server/
├── pom.xml                                       # Khai báo dependencies
├── src/main/resources/application.properties     # groq.api-key, model, history-max
├── src/main/java/com/web/
│   ├── api/
│   │   └── ChatAIApi.java                        # REST endpoint /api/chat-ai/*
│   ├── service/
│   │   ├── GroqService.java                      # ★ FILE QUAN TRỌNG NHẤT (~700 dòng)
│   │   └── VaccinePersonalizationService.java    # Logic phụ trợ tool getMy*
│   ├── repository/
│   │   ├── VaccineRepository.java
│   │   ├── VaccineScheduleRepository.java
│   │   ├── CustomerScheduleRepository.java
│   │   ├── CustomerProfileRepository.java
│   │   ├── VaccinationCertificateRepository.java
│   │   ├── CenterRepository.java
│   │   └── ... (các repo khác tool dùng)
│   └── utils/
│       └── UserUtils.java                        # Đọc JWT → User entity
└── ...

client-fe/
└── src/
    └── layout/customer/defaultLayout/
        └── AIChatbot.js                          # Widget floating + UI chat
```

---

## 11. Cách trả lời thầy / hội đồng

### Q: "Em dùng AI gì? Có phải ChatGPT không?"
> Em dùng **Groq Cloud** với model **Llama 3.3 70B** của Meta — free tier, tốc độ rất cao (LPU, ~300 tokens/giây). Không dùng ChatGPT vì OpenAI tính phí; Groq cùng chuẩn OpenAI API nên có thể swap LLM provider chỉ bằng đổi URL.

### Q: "Có gì khác chatbot bình thường?"
> Khác ở chỗ em dùng **Function Calling** — LLM tự gọi 11 hàm em viết trong `GroqService` để query DB thật, không trả lời theo trí nhớ. Đây là pattern industry-standard, GPT-4 và Claude đều dùng cùng cơ chế.

### Q: "Bảo mật data cá nhân thế nào?"
> 4 tool nhóm `getMy*` chỉ chạy khi có JWT hợp lệ. Em dùng `UserUtils.getUserWithAuthority()` đọc `SecurityContextHolder` — y hệt cơ chế bảo mật các API customer khác. Nếu chưa login, tool trả `requireLogin=true`, LLM sẽ bảo user đăng nhập.

### Q: "Có lo hallucinate (bịa data) không?"
> Em ép LLM dùng tool cho mọi câu hỏi về data hệ thống qua system prompt: "TUYỆT ĐỐI KHÔNG bịa data". Tham số tool được parse qua Jackson, không tin LLM 100%. Mọi giá/lịch/slot đều fetch trực tiếp từ MySQL.

### Q: "Engine gợi ý mũi tiếp theo dựa trên gì?"
> Em xây thuật toán đơn giản:
> 1. Lấy `birthdate` từ `CustomerProfile` → tính tuổi tháng
> 2. Đếm số mũi đã tiêm/finished từ `customer_schedule` theo từng vaccine
> 3. Vaccine nào `dose_completed < maxDose` → ưu tiên cao
> 4. Vaccine chưa tiêm + phù hợp `ageGroup.ageRange` → ưu tiên thường
> Có helper `parseAgeRangeToMonths()` dùng regex parse chuỗi VN ("0-1 tháng", "1-6 tuổi"...).

### Q: "Conversation history lưu ở đâu?"
> In-memory `ConcurrentHashMap<sessionId, Deque<Message>>`, giới hạn 10 cặp Q-A gần nhất. Cho demo đủ. Production scale-out sẽ chuyển sang Redis.

### Q: "Chi phí vận hành?"
> Hiện tại $0 — Groq free tier (30 req/phút). Đủ cho ~50 user đồng thời, vượt nhu cầu demo. Khi scale → upgrade Groq paid (~$0.05/1M tokens) hoặc swap OpenAI.

### Q: "Nếu Groq xuống thì sao?"
> Có 3 tầng error handling:
> 1. Lỗi `tool_use_failed` (model output sai format) → retry không tools
> 2. Tool execution error → trả error JSON, không kill conversation
> 3. Catch-all: trả message "Xin lỗi tôi không thể trả lời" thay vì crash 500
>
> Architecture cho phép swap LLM provider dễ dàng vì dùng chuẩn OpenAI API.

---

## 12. Định hướng phát triển tương lai

| Hướng | Mô tả | Ước tính công sức |
|---|---|---|
| **Persist history sang Redis** | Replace in-memory để chịu được restart + scale-out | 1-2 ngày |
| **Streaming response** | Dùng SSE để user thấy LLM "đang gõ" thay vì đợi full | 1 ngày |
| **Voice input** | Web Speech API → text → AI | 1 ngày |
| **Multi-modal** | Cho user upload ảnh giấy tiêm cũ → LLM đọc + nhập vào hệ thống | 2-3 ngày (cần Vision model) |
| **Function calling đa cấp** | Thêm tool `bookAppointment` để LLM **đặt giúp** (cần thêm guardrails) | 3-4 ngày |
| **A/B testing prompt** | So sánh hiệu quả các phiên bản system prompt | 1 ngày setup |
| **Fine-tuning** | Tự train model trên dữ liệu vaccine VN | rất lớn, không khuyến nghị |

---

## 13. Tổng kết các điểm sáng

✅ **Function Calling thật sự** — không phải prompt engineering kiểu cũ  
✅ **11 tool đa dạng**, có cả public + user-specific  
✅ **JWT-aware** — biết user nào đang hỏi, cá nhân hoá  
✅ **Engine gợi ý y tế** tự xây (tool #10)  
✅ **3 tầng error handling** — robust  
✅ **Conversation memory** per session  
✅ **Chuẩn OpenAI API** — dễ swap provider  
✅ **Free tier** — $0 chi phí demo  
✅ **Production patterns**: retry, fallback, logging  

---

*Tài liệu được biên soạn dựa trên codebase iVaccine, snapshot ngày tài liệu xuất.*
