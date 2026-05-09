package com.web.api;

import com.web.service.DeepSeekService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat-ai")
@CrossOrigin
public class ChatAIApi {

    @Autowired
    private DeepSeekService deepSeekService;

    @PostMapping("/ask")
    public ResponseEntity<String> askAI(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Nội dung không được để trống");
        }

        String response = deepSeekService.chatWithAI(message);
        return ResponseEntity.ok(response);
    }
}
