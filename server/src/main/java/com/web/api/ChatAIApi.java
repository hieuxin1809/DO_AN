package com.web.api;

import com.web.service.GroqService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat-ai")
@CrossOrigin
public class ChatAIApi {

    @Autowired
    private GroqService groqService;

    /**
     * Hỏi AI. FE gửi:
     *   { "message": "câu hỏi", "sessionId": "abc-xyz" }
     * sessionId optional — nếu rỗng sẽ dùng session "default".
     * AI nhớ ngữ cảnh dựa trên sessionId.
     */
    @PostMapping("/ask")
    public ResponseEntity<String> askAI(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Nội dung không được để trống");
        }
        String sessionId = request.getOrDefault("sessionId", "default");
        String response = groqService.chatWithAI(sessionId, message);
        return ResponseEntity.ok(response);
    }

    /** Xoá lịch sử hội thoại — gọi khi user reset chat hoặc đóng widget. */
    @PostMapping("/clear")
    public ResponseEntity<Void> clearHistory(@RequestBody Map<String, String> request) {
        String sessionId = request.get("sessionId");
        groqService.clearHistory(sessionId);
        return ResponseEntity.ok().build();
    }
}
