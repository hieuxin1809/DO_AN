package com.web.chat;

import com.web.entity.Chatting;
import com.web.entity.User;
import com.web.repository.ChatRepository;
import com.web.repository.UserRepository;
import com.web.utils.Contains;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.sql.Timestamp;
import java.util.*;

@Controller
public class MessageController {

    @Autowired
    private SimpMessagingTemplate simpMessagingTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatRepository chatRepository;

    /**
     * Lấy danh sách user có thể nhận chat từ khách hàng.
     * Bao gồm: Support Staff, Doctor, Nurse, Admin (mọi role trừ Customer).
     */
    /**
     * Chat từ khách hàng → broadcast tới ai?
     * Sau khi bỏ Support Staff + Nurse: chỉ Doctor xử lý chat khách.
     * Admin không nhận chat trực tiếp (chỉ vận hành hệ thống).
     */
    private List<User> getAllSupportStaff() {
        return new ArrayList<>(userRepository.getUserByRole(Contains.ROLE_DOCTOR));
    }

    @MessageMapping("/hello/{id}")
    public void send(SimpMessageHeaderAccessor sha, @Payload String message,@DestinationVariable String id) {
        System.out.println("sha: "+sha.getUser().getName());
        System.out.println("payload: "+message);
        User reciver = null;
        if(Long.valueOf(id) > 0){
            reciver = userRepository.findById(Long.valueOf(id)).get();
            System.out.println("userss === : "+reciver);
        }
        User sender = userRepository.findByUsername(sha.getUser().getName()).get();
        Chatting chatting = new Chatting();
        chatting.setContent(message);
        chatting.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        chatting.setReceiver(reciver);
        chatting.setSender(sender);
        chatRepository.save(chatting);
        Map<String, Object> map = new HashMap<>();
        map.put("sender", sender.getId());
        map.put("isFile", 0);
        if(reciver == null){
            List<User> list = getAllSupportStaff();
            System.out.println("[Chat] broadcasting to " + list.size() + " staff users");
            for (User user : list) {
                simpMessagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/messages", message,map);
            }
        }
        else{
            simpMessagingTemplate.convertAndSendToUser(reciver.getEmail(), "/queue/messages", message,map);
        }
    }


    @MessageMapping("/file/{id}/{filename}")
    public void sendFile(SimpMessageHeaderAccessor sha, @Payload String message,@DestinationVariable String id,
                         @DestinationVariable String filename) {
        User reciver = null;
        if(Long.valueOf(id) > 0){
            reciver = userRepository.findById(Long.valueOf(id)).get();
            System.out.println("userss === : "+reciver);
        }
        User sender = userRepository.findByUsername(sha.getUser().getName()).get();
        Chatting chatting = new Chatting();
        chatting.setContent(message);
        chatting.setIsFile(true);
        chatting.setFileName(filename);
        chatting.setCreatedDate(new Timestamp(System.currentTimeMillis()));
        chatting.setReceiver(reciver);
        chatting.setSender(sender);
        chatRepository.save(chatting);
        Map<String, Object> map = new HashMap<>();
        map.put("sender", sender.getId());
        map.put("isFile", 1);
        if(reciver == null){
            List<User> list = getAllSupportStaff();
            for (User user : list) {
                simpMessagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/messages", message,map);
            }
        }
        else{
            simpMessagingTemplate.convertAndSendToUser(reciver.getEmail(), "/queue/messages", message,map);
        }
    }

}
