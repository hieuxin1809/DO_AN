package com.web.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
public class DeepSeekService {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekService.class);

    private final String API_KEY = "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";
    private final String API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private final String MODEL = "llama-3.1-8b-instant";

    private final String SYSTEM_PROMPT =
            "Bạn là một trợ lý y tế và chuyên gia tư vấn vaccine tại Trung tâm tiêm chủng iVaccine. " +
            "Nhiệm vụ của bạn là giải đáp các thắc mắc về y tế, tư vấn các loại vaccine phù hợp theo độ tuổi, theo mùa, và cho người chuẩn bị đi nước ngoài. " +
            "Hãy trả lời một cách chuyên nghiệp, ngắn gọn, thân thiện, mang tính khoa học. Nếu được hỏi về một bệnh cụ thể, hãy gợi ý vaccine phòng ngừa. " +
            "Tuy nhiên, hãy luôn lưu ý khách hàng nên đến trực tiếp trung tâm để bác sĩ thăm khám trước khi tiêm.";

    public String chatWithAI(String userMessage) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(API_KEY);

            List<Map<String, String>> messages = new ArrayList<>();

            Map<String, String> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", SYSTEM_PROMPT);
            messages.add(systemMsg);

            Map<String, String> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", userMessage);
            messages.add(userMsg);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", MODEL);
            requestBody.put("messages", messages);
            requestBody.put("stream", false);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.info("Calling DeepSeek API with message: {}", userMessage);
            ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, request, Map.class);
            Map<String, Object> responseBody = response.getBody();
            log.info("DeepSeek response status: {}", response.getStatusCode());

            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }
            log.warn("DeepSeek returned unexpected response body: {}", responseBody);
            return "Xin lỗi, hiện tại tôi không thể trả lời. Bạn vui lòng thử lại sau nhé!";

        } catch (HttpClientErrorException e) {
            log.error("DeepSeek API client error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return "Xin lỗi, hiện tại tôi không thể trả lời. Bạn vui lòng thử lại sau.";
        } catch (HttpServerErrorException e) {
            log.error("DeepSeek API server error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return "Xin lỗi, hiện tại tôi không thể trả lời. Bạn vui lòng thử lại sau.";
        } catch (Exception e) {
            log.error("DeepSeek API unexpected error: {}", e.getMessage(), e);
            return "Xin lỗi, hiện tại tôi không thể trả lời. Bạn vui lòng thử lại sau.";
        }
    }
}
