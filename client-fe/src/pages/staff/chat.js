import { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import avatar from "../../assest/images/avatar.png";
import styles from "./staffChat.module.scss";
import { getMethod, uploadSingleFile } from "../../services/request";
import { toast } from "react-toastify";

const StaffChat = () => {
  const [client, setClient] = useState(null);
  const [itemUser, setItemUser] = useState([]);
  const [itemChat, setItemChat] = useState([]);
  const [email, setEmail] = useState(null);
  const [newMessagesCount, setNewMessagesCount] = useState({});

  // Refs để tránh stale closure trong WebSocket callback
  const currentUserIdRef = useRef(null);

  const loadChatByUserId = async (userId) => {
    if (!userId) return;
    try {
      const response = await getMethod(`/api/chat/staff/getListChat?idreciver=${userId}`);
      const result = await response.json();
      if (Array.isArray(result)) {
        setItemChat(result);
      } else {
        setItemChat([]);
      }
    } catch (error) {
      console.error("Error fetching chat messages:", error);
    }
  };

  const loadUserChatList = async (search = "") => {
    const searchPart = search ? `?search=${search}` : "";
    try {
      const response = await getMethod(`/api/chat/staff/getAllUserChat${searchPart}`);
      const result = await response.json();
      if (Array.isArray(result)) {
        setItemUser(result);
      } else {
        setItemUser([]);
      }
    } catch (error) {
      console.error("Error fetching user chat list:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      const el = document.getElementById("listchatadmin");
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  };

  // Auto scroll khi itemChat thay đổi
  useEffect(() => {
    const el = document.getElementById("listchatadmin");
    if (el) el.scrollTop = el.scrollHeight;
  }, [itemChat]);

  // Polling: mỗi 3 giây cập nhật cả danh sách user (badge) lẫn tin nhắn hiện tại
  useEffect(() => {
    const timer = setInterval(async () => {
      // ✅ Luôn cập nhật danh sách user để badge số tin chưa đọc luôn mới nhất
      loadUserChatList();

      // Nếu đang xem cuộc trò chuyện → cập nhật tin nhắn
      const uid = currentUserIdRef.current;
      if (!uid) return;
      try {
        const response = await getMethod(`/api/chat/staff/getListChatOnly?idreciver=${uid}`);
        const result = await response.json();
        if (Array.isArray(result)) {
          setItemChat((prev) => {
            if (prev.length !== result.length) {
              return result;
            }
            return prev;
          });
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Đọc URL params và load data ban đầu
    const initPageData = async () => {
      await loadUserChatList();
      const params = new URL(document.URL).searchParams;
      const id = params.get("user");
      const emailFromUrl = params.get("email");
      if (id && emailFromUrl) {
        currentUserIdRef.current = id;
        setEmail(emailFromUrl);
        await loadChatByUserId(id);
      }
    };
    initPageData();

    const userlc = localStorage.getItem("user");
    const userEmail = userlc ? JSON.parse(userlc)?.email : null;

    const sock = new SockJS("http://localhost:8080/hello");
    const stompClient = new Client({
      webSocketFactory: () => sock,
      onConnect: () => {
        console.log("[WS Staff] Đã kết nối WebSocket thành công!");

        stompClient.subscribe("/users/queue/messages", (msg) => {
          console.log("[WS Staff] Nhận tin nhắn:", msg.body, "headers:", msg.headers);

          const isFile = Number(msg.headers?.isFile ?? 0) === 1;

          // Parse senderId từ header (Long từ Java → string trên STOMP)
          const rawSender = msg.headers?.sender;
          const senderIdStr = rawSender != null ? String(rawSender).replace(/\D/g, "") : null;
          const senderId = senderIdStr && senderIdStr.length > 0 ? senderIdStr : null;

          const currentUserId = currentUserIdRef.current;
          console.log("[WS Staff] currentUserId:", currentUserId, "senderId:", senderId);

          const isFromCurrentUser =
            currentUserId &&
            (!senderId || String(senderId) === String(currentUserId));

          if (isFromCurrentUser) {
            // ✅ Tin nhắn từ khách đang xem → thêm trực tiếp vào state (không cần HTTP)
            setItemChat((prev) => [
              ...prev,
              {
                sender: { id: senderId || currentUserId },
                content: msg.body,
                isFile: isFile,
              },
            ]);
            scrollToBottom();
          } else if (currentUserId && senderId && String(senderId) !== String(currentUserId)) {
            // Tin nhắn từ khách KHÁC → badge + toast
            toast.info("Bạn có tin nhắn mới!");
            setNewMessagesCount((prev) => ({
              ...prev,
              [senderId]: (prev[senderId] || 0) + 1,
            }));
          } else if (!currentUserId) {
            // Không đang xem cuộc trò chuyện nào
            toast.info("Bạn có tin nhắn mới!");
            if (senderId) {
              setNewMessagesCount((prev) => ({
                ...prev,
                [senderId]: (prev[senderId] || 0) + 1,
              }));
            }
          }

          // Luôn cập nhật sidebar (badge count từ DB)
          loadUserChatList();
        });
      },
      onDisconnect: () => {
        console.log("[WS Staff] WebSocket ngắt kết nối");
      },
      onStompError: (frame) => {
        console.error("[WS Staff] Lỗi STOMP:", frame);
      },
      connectHeaders: {
        username: userEmail,
      },
    });

    stompClient.activate();
    setClient(stompClient);

    return () => {
      stompClient.deactivate();
    };
  }, []);

  const sendMessage = () => {
    const id = new URL(document.URL).searchParams.get("user");
    const messageContent = document.getElementById("contentmess").value;
    const userlc = localStorage.getItem("user");
    const userEmail = userlc ? JSON.parse(userlc)?.email : null;

    if (client && client.connected && id && messageContent.trim()) {
      client.publish({
        destination: `/app/hello/${id}`,
        body: messageContent,
      });

      // Optimistic update: thêm tin nhắn ngay vào state
      setItemChat((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { sender: userEmail, content: messageContent, isFile: false },
      ]);
      scrollToBottom();

      setItemUser((prevUsers) => {
        if (!Array.isArray(prevUsers)) return prevUsers;
        const updated = [...prevUsers];
        const idx = updated.findIndex((u) => String(u?.user?.id) === String(id));
        if (idx > -1) updated.unshift(...updated.splice(idx, 1));
        return updated;
      });

      document.getElementById("contentmess").value = "";
    }
  };

  const loadMessage = (user) => {
    if (!user || !user.id) return;
    setNewMessagesCount((prev) => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
    window.location.href = `chat?user=${user.id}&email=${user.email}`;
  };

  const sendFileMessage = async () => {
    const fileInput = document.getElementById("btnsendfile");
    const file = fileInput?.files?.[0];
    if (!file) return;
    const userlc = localStorage.getItem("user");
    const userEmail = userlc ? JSON.parse(userlc)?.email : null;

    try {
      const link = await uploadSingleFile(fileInput);
      const id = new URL(document.URL).searchParams.get("user");

      if (client && client.connected && id) {
        client.publish({
          destination: `/app/file/${id}/${file.name}`,
          body: link,
        });

        setItemChat((prev) => [
          ...(Array.isArray(prev) ? prev : []),
          { sender: userEmail, content: link, isFile: true },
        ]);
        scrollToBottom();

        setItemUser((prevUsers) => {
          if (!Array.isArray(prevUsers)) return prevUsers;
          const updated = [...prevUsers];
          const idx = updated.findIndex((u) => String(u?.user?.id) === String(id));
          if (idx > -1) updated.unshift(...updated.splice(idx, 1));
          return updated;
        });
      }
      fileInput.value = "";
    } catch (error) {
      console.error("Error sending file:", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const searchKey = async () => {
    const param = document.getElementById("keysearchuser")?.value || "";
    await loadUserChatList(param);
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.headerTitle}>Chats</span>
        </div>
        <div className={styles.searchWrapper}>
          <input
            onKeyUp={searchKey}
            id="keysearchuser"
            className={styles.searchInput}
            type="text"
            placeholder="Search..."
          />
        </div>
        <ul className={styles.userList}>
          {Array.isArray(itemUser) &&
            itemUser.map((item, index) => {
              const dbCount = item?.numUnread || 0;
              const newCount = newMessagesCount[item?.user?.id] || 0;
              const totalUnread = dbCount + newCount;
              return (
                <li
                  key={index}
                  className={styles.userItem}
                  onClick={() => item?.user && loadMessage(item.user)}
                >
                  <img src={avatar} className={styles.avatar} alt="Avatar" />
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{item?.user?.email || "Unknown"}</span>
                  </div>
                  {totalUnread > 0 && (
                    <span className={styles.unreadBadge}>{totalUnread}</span>
                  )}
                </li>
              );
            })}
        </ul>
      </div>

      <div className={styles.chatArea}>
        {email == null ? (
          <div className={styles.noChatSelected}>
            <p>Select a conversation to start chatting.</p>
          </div>
        ) : (
          <>
            <div className={styles.chatHeader}>
              <span className={styles.chatTitle}>{email}</span>
            </div>
            <div className={styles.chatContent} id="listchatadmin">
              {Array.isArray(itemChat) && itemChat.length > 0 ? (
                itemChat.map((item, index) => {
                  const userlc = localStorage.getItem("user");
                  const loggedInEmail = userlc ? JSON.parse(userlc)?.email : null;

                  let isCustomer = true;
                  if (item.sender && item.sender.email === loggedInEmail) {
                    isCustomer = false;
                  } else if (item.sender === loggedInEmail) {
                    isCustomer = false;
                  }

                  const messageClass = isCustomer ? styles.customer : styles.admin;
                  const messageType = item.isFile ? styles.image : "";

                  return (
                    <div
                      key={index}
                      className={`${styles.message} ${messageClass} ${messageType}`}
                    >
                      {item.isFile ? (
                        <img src={item.content} alt="Message" />
                      ) : (
                        <p>{item.content}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>No messages available.</p>
              )}
            </div>

            <div className={styles.chatFooter}>
              <input
                onKeyDown={handleKeyDown}
                type="text"
                id="contentmess"
                className={styles.inputMessage}
                placeholder="Write a message..."
              />
              <button
                className={styles.iconButton}
                onClick={() => document.getElementById("btnsendfile").click()}
              >
                <i className="fa fa-image"></i>
              </button>
              <button onClick={sendMessage} className={styles.sendButton} id="sendmess">
                <i className="fa fa-paper-plane"></i>
              </button>
              <input
                onChange={sendFileMessage}
                type="file"
                id="btnsendfile"
                style={{ display: "none" }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffChat;
