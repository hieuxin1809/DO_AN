package com.web.repository;

import com.web.entity.Chatting;
import com.web.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface ChatRepository extends JpaRepository<Chatting,Long> {

    @Query(value = "select c from Chatting c where (c.sender.id = ?1 or c.receiver.id = ?1 )")
    public List<Chatting> findByUser(Long idUser);

    @Query("select c.sender from Chatting c where c.receiver is null and (c.sender.email like ?1) ")
    public Set<User> getAllUserChat(String param);

    @Query("select c from Chatting c where c.sender.id = ?1 or c.receiver.id = ?1")
    List<Chatting> myChat(Long id);

    @Query(value = "select c.* from chatting c where (c.sender = ?1 or c.receiver = ?1 ) order by id desc limit 1 offset  0", nativeQuery = true)
    public Chatting findLastChatting(Long idUser);

    @Query("select count(c) from Chatting c where c.sender.id = ?1 and c.receiver is null and (c.isRead = false or c.isRead is null)")
    Long countUnreadMessagesFromUser(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("update Chatting c set c.isRead = true where c.sender.id = ?1 and c.receiver is null")
    void markMessagesAsRead(Long userId);
}

