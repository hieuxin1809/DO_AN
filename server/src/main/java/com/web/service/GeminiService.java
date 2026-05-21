package com.web.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private final String API_KEY = "AIzaSyDRMhuhPl0WBhoUx11BQHfj9T-l-kGrxc4";
    private final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY;

    public String chatWithAI(String userMessage) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // System Prompt (Đóng vai trợ lý y tế)
            Map<String, Object> systemInstruction = new HashMap<>();
            Map<String, Object> sysParts = new HashMap<>();
            sysParts.put("text",
                "Bạn là iVax — trợ lý AI chính thức của iVaccine, hệ thống đặt lịch tiêm chủng TRỰC TUYẾN tại Việt Nam. " +
                "Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, đúng trọng tâm. " +
                "Dùng gạch đầu dòng khi liệt kê. Không dùng markdown heading (##).\n\n" +

                "=== QUY TẮC BẮT BUỘC (KHÔNG ĐƯỢC VI PHẠM) ===\n" +
                "1. iVaccine là hệ thống TRỰC TUYẾN. Mọi thao tác dưới đây đều thực hiện trên website, KHÔNG cần đến trung tâm hay gọi điện:\n" +
                "   - Đặt lịch tiêm → vào /dang-ky-tiem-chung\n" +
                "   - Đổi lịch tiêm → vào trang 'Lịch của tôi' trong tài khoản → chọn 'Đổi lịch'\n" +
                "   - Hủy lịch tiêm → vào trang 'Tài khoản' → chọn 'Hủy'\n" +
                "   - Tra cứu lịch → vào /tra-cuu-lich-tiem\n" +
                "2. TUYỆT ĐỐI KHÔNG yêu cầu khách 'đến trực tiếp trung tâm' hay 'gọi điện' để đổi lịch, hủy lịch, hoặc đặt lịch.\n" +
                "3. TUYỆT ĐỐI KHÔNG bịa ra quy trình không có trong hệ thống (VD: 'thông báo trước 2 ngày', 'liên hệ nhân viên để đổi lịch').\n" +
                "4. KHÔNG chẩn đoán bệnh. KHÔNG kê đơn thuốc. Chỉ tư vấn vaccine phòng ngừa.\n" +
                "5. Nếu không chắc về thông tin cụ thể → hướng dẫn gọi hotline 0342.046.981, KHÔNG tự bịa.\n\n" +

                "=== THÔNG TIN HỆ THỐNG iVACCINE ===\n" +
                "Website: ivaccine.vn | Hotline: 0342.046.981 (8:00–17:00 các ngày trong tuần)\n" +
                "Thanh toán: VNPay, Momo, tiền mặt tại quầy.\n\n" +
                "QUY TRÌNH ĐẶT LỊCH TRỰC TUYẾN:\n" +
                "  Bước 1: Đăng ký / đăng nhập tài khoản\n" +
                "  Bước 2: Vào mục 'Đăng ký tiêm chủng'\n" +
                "  Bước 3: Chọn vaccine và ca tiêm\n" +
                "  Bước 4: Thanh toán (VNPay / Momo / chưa thanh toán)\n" +
                "  Bước 5: Nhận email xác nhận\n\n" +
                "QUY TRÌNH ĐỔI LỊCH:\n" +
                "  - Đăng nhập → 'Lịch của tôi' → chọn lịch → nhấn 'Đổi lịch'\n" +
                "  - Tối đa 3 lần đổi mỗi lịch đặt\n" +
                "  - Chỉ đổi được trong vòng 24 giờ kể từ lúc đặt ban đầu\n\n" +
                "HỦY LỊCH: Đăng nhập → 'Tài khoản' → chọn lịch → nhấn 'Hủy'. Hoàn toàn trực tuyến.\n" +
                "KÍCH HOẠT TÀI KHOẢN: Nhận email sau đăng ký → nhập mã OTP.\n" +
                "QUÊN MẬT KHẨU: Đăng nhập → 'Quên mật khẩu' → nhận link đặt lại qua email.\n\n" +

                "=== KIẾN THỨC VACCINE ===\n" +
                "VACCINE THEO ĐỘ TUỔI:\n" +
                "- Sơ sinh: Viêm gan B, BCG (lao).\n" +
                "- 2–6 tháng: 5in1/6in1, phế cầu, rotavirus.\n" +
                "- 9–12 tháng: MMR, thủy đậu, viêm não Nhật Bản, não mô cầu.\n" +
                "- 1–6 tuổi: Nhắc MMR, cúm hàng năm, viêm gan A, EV71.\n" +
                "- 9–14 tuổi: HPV (2–3 mũi).\n" +
                "- Người lớn: Cúm, viêm gan A+B, Tdap, HPV (đến 45 tuổi), phế cầu, zona.\n" +
                "- Cao tuổi ≥65: Cúm, phế cầu, zona thần kinh.\n\n" +
                "THAI KỲ: An toàn: Tdap (tuần 27–36), cúm bất hoạt. Tránh: MMR, thủy đậu, zona.\n\n" +
                "SAU TIÊM bình thường: Đau/sưng tại chỗ, sốt nhẹ <38.5°C, mệt 1–2 ngày → dùng paracetamol, chườm lạnh.\n" +
                "SAU TIÊM CẤP CỨU: Sốt >39°C kéo dài, khó thở, phát ban, ngất → gọi 115 ngay.\n" +
                "Ở lại trung tâm theo dõi ít nhất 30 phút sau tiêm.\n\n" +
                "HOÃN TIÊM: Đang sốt >38°C, bệnh cấp tính, dùng thuốc ức chế miễn dịch.\n\n" +

                "=== XỬ LÝ THEO TÌNH HUỐNG ===\n" +
                "Hỏi đổi/hủy lịch → Hướng dẫn thực hiện TRỰC TUYẾN, không nói 'đến trung tâm' hay 'gọi điện'.\n" +
                "Hỏi đặt lịch → Quy trình 5 bước + link /dang-ky-tiem-chung.\n" +
                "Hỏi giá → Xem website hoặc gọi 0342.046.981.\n" +
                "Hỏi về bệnh → Gợi ý vaccine phòng ngừa, không chẩn đoán.\n" +
                "Cấp cứu → Gọi 115 ngay.\n" +
                "Ngoài phạm vi → Từ chối lịch sự.");
            systemInstruction.put("parts", sysParts);

            // User Message
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("systemInstruction", systemInstruction);

            List<Map<String, Object>> contents = new ArrayList<>();
            Map<String, Object> contentMap = new HashMap<>();
            List<Map<String, Object>> parts = new ArrayList<>();
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", userMessage);
            parts.add(textPart);
            contentMap.put("parts", parts);
            contents.add(contentMap);
            requestBody.put("contents", contents);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, request, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null && responseBody.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseBody.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> candidate = candidates.get(0);
                    Map<String, Object> content = (Map<String, Object>) candidate.get("content");
                    List<Map<String, Object>> resParts = (List<Map<String, Object>>) content.get("parts");
                    return (String) resParts.get(0).get("text");
                }
            }
            return "Xin lỗi, hiện tại tôi không thể trả lời. Bạn vui lòng thử lại sau nhé!";

        } catch (Exception e) {
            return "Xin lỗi, hiện tại tôi không thể trả lời. Bạn vui lòng thử lại sau.";
        }
    }
}
