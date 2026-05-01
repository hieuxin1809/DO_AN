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

    private final String API_KEY = "AIzaSyBFhsax7bKLBsOccd_6ZofWcsI4uPQSTBM";
    private final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY;

    public String chatWithAI(String userMessage) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // System Prompt (Đóng vai trợ lý y tế)
            Map<String, Object> systemInstruction = new HashMap<>();
            Map<String, Object> sysParts = new HashMap<>();
            sysParts.put("text", "Bạn là một trợ lý y tế và chuyên gia tư vấn vaccine tại Trung tâm tiêm chủng iVaccine. " +
                    "Nhiệm vụ của bạn là giải đáp các thắc mắc về y tế, tư vấn các loại vaccine phù hợp theo độ tuổi, theo mùa, và cho người chuẩn bị đi nước ngoài. " +
                    "Hãy trả lời một cách chuyên nghiệp, ngắn gọn, thân thiện, mang tính khoa học. Nếu được hỏi về một bệnh cụ thể, hãy gợi ý vaccine phòng ngừa. " +
                    "Tuy nhiên, hãy luôn lưu ý khách hàng nên đến trực tiếp trung tâm để bác sĩ thăm khám trước khi tiêm.");
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
