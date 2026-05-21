import { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import styles from "./staffChat.module.scss";
import { getMethod, uploadSingleFile } from "../../services/request";
import { toast } from "react-toastify";

/* ─── InitialsAvatar — generate avatar từ email với màu nhất quán theo hash ── */
const AVATAR_COLORS = [
  ['#f97316','#fb923c'], ['#ef4444','#f87171'], ['#ec4899','#f472b6'],
  ['#a855f7','#c084fc'], ['#8b5cf6','#a78bfa'], ['#6366f1','#818cf8'],
  ['#3b82f6','#60a5fa'], ['#0ea5e9','#38bdf8'], ['#06b6d4','#22d3ee'],
  ['#14b8a6','#2dd4bf'], ['#10b981','#34d399'], ['#84cc16','#a3e635'],
];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getInitials(email) {
  if (!email) return "?";
  const name = String(email).split("@")[0] || "?";
  // Lấy 2 ký tự đầu, in hoa
  return name.slice(0, 2).toUpperCase();
}

function InitialsAvatar({ email, size = 42, className }) {
  const text = getInitials(email);
  const [c1, c2] = AVATAR_COLORS[hashCode(email || "_") % AVATAR_COLORS.length];
  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: Math.round(size * 0.4),
        flexShrink: 0, letterSpacing: "0.5px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        userSelect: "none",
      }}
      title={email}
    >
      {text}
    </div>
  );
}

const StaffChat = () => {
  const [client,           setClient]           = useState(null);
  const [itemUser,         setItemUser]         = useState([]);
  const [itemChat,         setItemChat]         = useState([]);
  const [email,            setEmail]            = useState(null);
  const [newMessagesCount, setNewMessagesCount] = useState({});
  const [loadingChat,      setLoadingChat]      = useState(false);

  // Ref để tránh stale closure trong WebSocket callback
  const currentUserIdRef = useRef(null);
  const currentEmailRef  = useRef(null);

  /* ─── API helpers ─────────────────────────────────────── */
  const loadChatByUserId = async (userId) => {
    if (!userId) return;
    setLoadingChat(true);
    try {
      const res    = await getMethod(`/api/chat/staff/getListChat?idreciver=${userId}`);
      const result = await res.json();
      setItemChat(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("loadChatByUserId error:", err);
    } finally {
      setLoadingChat(false);
    }
  };

  const loadUserChatList = async (search = "") => {
    const q = search ? `?search=${search}` : "";
    try {
      const res    = await getMethod(`/api/chat/staff/getAllUserChat${q}`);
      const result = await res.json();
      setItemUser(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("loadUserChatList error:", err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      const el = document.getElementById("listchatadmin");
      if (el) el.scrollTop = el.scrollHeight;
    }, 80);
  };

  /* ─── Auto-scroll on new messages ────────────────────── */
  useEffect(() => {
    const el = document.getElementById("listchatadmin");
    if (el) el.scrollTop = el.scrollHeight;
  }, [itemChat]);

  /* ─── Polling: chỉ cập nhật badge sidebar (KHÔNG poll tin nhắn)
         Tin nhắn đến được xử lý qua WebSocket realtime bên dưới ── */
  useEffect(() => {
    const timer = setInterval(() => loadUserChatList(), 3000);
    return () => clearInterval(timer);
  }, []);

  /* ─── WebSocket + initial data load ──────────────────── */
  useEffect(() => {
    // Load dữ liệu ban đầu từ URL params (trường hợp bookmark / direct link)
    const initPageData = async () => {
      const params       = new URL(document.URL).searchParams;
      const id           = params.get("user");
      const emailFromUrl = params.get("email");
      if (id && emailFromUrl) {
        currentUserIdRef.current = id;
        currentEmailRef.current  = emailFromUrl;
        setEmail(emailFromUrl);
        await loadChatByUserId(id);   // đánh dấu đã đọc trước
      }
      await loadUserChatList();       // rồi mới refresh badge
    };
    initPageData();

    const userlc    = localStorage.getItem("user");
    const userEmail = userlc ? JSON.parse(userlc)?.email : null;

    const stompClient = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/hello"),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("[WS Staff] Kết nối thành công");

        stompClient.subscribe("/users/queue/messages", (msg) => {
          const isFile      = Number(msg.headers?.isFile ?? 0) === 1;
          const rawSender   = msg.headers?.sender;
          const senderStr   = rawSender != null ? String(rawSender).trim() : "";
          // Backend có thể gửi sender là email ("a@b.com") hoặc là numeric ID ("5").
          // Nếu là email → so với currentEmailRef.
          // Nếu là số thuần → so với currentUserIdRef.
          // Nếu rỗng → coi như từ conversation đang mở.
          const isPureNumeric = /^\d+$/.test(senderStr);
          const isEmail       = senderStr.includes("@");
          const currentId     = currentUserIdRef.current;
          const currentEmail  = currentEmailRef.current;

          const isFromOpenConversation =
            currentId && (
              senderStr === "" ||
              (isPureNumeric && senderStr === String(currentId)) ||
              (isEmail && currentEmail && senderStr.toLowerCase() === String(currentEmail).toLowerCase())
            );

          console.log("[WS Staff] msg received", {
            rawSender, senderStr, currentId, currentEmail, isFromOpenConversation,
          });

          if (isFromOpenConversation) {
            // Tin nhắn từ khách đang mở → thêm thẳng vào state
            setItemChat(prev => [
              ...(Array.isArray(prev) ? prev : []),
              {
                sender: isEmail ? { email: senderStr } : { id: senderStr || currentId },
                content: msg.body,
                isFile,
              },
            ]);
            scrollToBottom();
          } else {
            // Tin nhắn từ khách khác → chỉ hiện badge + toast
            toast.info("Bạn có tin nhắn mới!");
            // Key cho badge: dùng raw sender (email hoặc id) — sẽ refresh từ DB qua loadUserChatList
            if (senderStr) {
              setNewMessagesCount(prev => ({
                ...prev,
                [senderStr]: (prev[senderStr] || 0) + 1,
              }));
            }
          }

          // Cập nhật badge sidebar
          loadUserChatList();
        });
      },
      onDisconnect: () => console.log("[WS Staff] Ngắt kết nối"),
      onStompError:  (f) => console.error("[WS Staff] STOMP error:", f),
      connectHeaders: { username: userEmail },
    });

    stompClient.activate();
    setClient(stompClient);
    return () => stompClient.deactivate();
  }, []);

  /* ─── Chọn cuộc trò chuyện (không reload trang) ──────── */
  const loadMessage = async (user) => {
    if (!user?.id) return;
    const userId    = String(user.id);
    const userEmail = user.email;

    // Xoá badge ngay (cả key theo id lẫn theo email vì WS có thể đẩy theo email)
    setNewMessagesCount(prev => {
      const n = { ...prev };
      delete n[userId];
      if (userEmail) delete n[userEmail];
      return n;
    });

    if (userId === currentUserIdRef.current) {
      // Cùng conversation đang mở → chỉ refresh badge, KHÔNG reload chat
      // (reload sẽ mất tin nhắn optimistic của staff)
      await loadUserChatList();
      return;
    }

    // Conversation khác → chuyển sang
    currentUserIdRef.current = userId;
    currentEmailRef.current  = userEmail;
    setEmail(userEmail);
    setItemChat([]);  // clear nội dung cũ

    await loadChatByUserId(userId);
    await loadUserChatList();
  };

  /* ─── Gửi tin nhắn text ───────────────────────────────── */
  const sendMessage = () => {
    const id      = currentUserIdRef.current;
    const input   = document.getElementById("contentmess");
    const content = input?.value?.trim() ?? "";
    const userlc  = localStorage.getItem("user");
    const myEmail = userlc ? JSON.parse(userlc)?.email : null;

    if (!content)  return;
    if (!id)       { toast.warning("Vui lòng chọn cuộc trò chuyện trước!"); return; }
    if (!client?.connected) { toast.warning("Hệ thống chat chưa kết nối, vui lòng thử lại!"); return; }

    // Gửi qua WebSocket
    client.publish({ destination: `/app/hello/${id}`, body: content });
    if (input) input.value = "";

    // Hiện tin nhắn ngay (optimistic) — đánh dấu isSentByMe để luôn render đúng bubble
    setItemChat(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { sender: myEmail, content, isFile: false, isSentByMe: true },
    ]);
    scrollToBottom();

    // Đẩy conversation lên đầu sidebar
    setItemUser(prev => {
      if (!Array.isArray(prev)) return prev;
      const arr = [...prev];
      const idx = arr.findIndex(u => String(u?.user?.id) === id);
      if (idx > -1) arr.unshift(...arr.splice(idx, 1));
      return arr;
    });
  };

  /* ─── Gửi file / ảnh ─────────────────────────────────── */
  const sendFileMessage = async () => {
    const fileInput = document.getElementById("btnsendfile");
    const file      = fileInput?.files?.[0];
    if (!file) return;

    const id = currentUserIdRef.current;
    if (!id)               { toast.warning("Vui lòng chọn cuộc trò chuyện trước!"); return; }
    if (!client?.connected){ toast.warning("Hệ thống chat chưa kết nối, vui lòng thử lại!"); return; }

    try {
      const link = await uploadSingleFile(fileInput);
      client.publish({ destination: `/app/file/${id}/${file.name}`, body: link });

      setItemChat(prev => [
        ...(Array.isArray(prev) ? prev : []),
        { sender: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user"))?.email : null, content: link, isFile: true, isSentByMe: true },
      ]);
      scrollToBottom();

      setItemUser(prev => {
        if (!Array.isArray(prev)) return prev;
        const arr = [...prev];
        const idx = arr.findIndex(u => String(u?.user?.id) === id);
        if (idx > -1) arr.unshift(...arr.splice(idx, 1));
        return arr;
      });
      fileInput.value = "";
    } catch (err) {
      console.error("sendFileMessage error:", err);
      toast.error("Gửi file thất bại!");
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") sendMessage(); };

  const searchKey = async () => {
    const param = document.getElementById("keysearchuser")?.value || "";
    await loadUserChatList(param);
  };

  /* ─── Render ──────────────────────────────────────────── */
  const loggedInEmail = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}")?.email ?? null; }
    catch { return null; }
  })();

  return (
    <div className={styles.chatContainer}>

      {/* ── Sidebar ── */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.headerTitle}>Tin Nhắn</span>
        </div>
        <div className={styles.searchWrapper}>
          <input
            onKeyUp={searchKey}
            id="keysearchuser"
            className={styles.searchInput}
            type="text"
            placeholder="Tìm kiếm..."
          />
        </div>
        <ul className={styles.userList}>
          {Array.isArray(itemUser) && itemUser.map((item, idx) => {
            const dbCount    = item?.numUnread || 0;
            const localCount = newMessagesCount[item?.user?.id] || 0;
            const total      = dbCount + localCount;
            const isActive   = String(item?.user?.id) === String(currentUserIdRef.current);
            return (
              <li
                key={idx}
                className={styles.userItem}
                onClick={() => item?.user && loadMessage(item.user)}
                style={{ background: isActive ? "#eff6ff" : undefined }}
              >
                <InitialsAvatar email={item?.user?.email} size={42} className={styles.avatar} />
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{item?.user?.email || "Unknown"}</span>
                </div>
                {total > 0 && <span className={styles.unreadBadge}>{total}</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Chat area ── */}
      <div className={styles.chatArea}>
        {email == null ? (
          <div className={styles.noChatSelected}>
            <p>Chọn một cuộc trò chuyện để bắt đầu.</p>
          </div>
        ) : (
          <>
            <div className={styles.chatHeader} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <InitialsAvatar email={email} size={38} />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span className={styles.chatTitle}>{email}</span>
              </div>
            </div>

            <div className={styles.chatContent} id="listchatadmin">
              {loadingChat ? (
                <div style={{ textAlign: "center", color: "#94a3b8", paddingTop: 40 }}>Đang tải...</div>
              ) : !Array.isArray(itemChat) || itemChat.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", paddingTop: 40 }}>Chưa có tin nhắn nào.</div>
              ) : itemChat.map((item, idx) => {
                // Xác định tin nhắn của nhân viên hay khách
                // isSentByMe: true  → optimistic (staff vừa gửi, chưa có trong DB)
                // sender.email match → tin nhắn staff đã load từ server
                const isAdmin =
                  item.isSentByMe === true ||
                  (item.sender && item.sender.email === loggedInEmail) ||
                  item.sender === loggedInEmail;

                const msgClass  = isAdmin ? styles.admin : styles.customer;
                const fileClass = item.isFile ? styles.image : "";

                return (
                  <div key={idx} className={`${styles.message} ${msgClass} ${fileClass}`}>
                    {item.isFile
                      ? <img src={item.content} alt="file" />
                      : <p>{item.content}</p>}
                  </div>
                );
              })}
            </div>

            <div className={styles.chatFooter}>
              <input
                onKeyDown={handleKeyDown}
                type="text"
                id="contentmess"
                className={styles.inputMessage}
                placeholder="Nhập tin nhắn..."
              />
              <button
                className={styles.iconButton}
                onClick={() => document.getElementById("btnsendfile").click()}
              >
                <i className="fa fa-image" />
              </button>
              <button onClick={sendMessage} className={styles.sendButton}>
                <i className="fa fa-paper-plane" />
              </button>
              <input onChange={sendFileMessage} type="file" id="btnsendfile" style={{ display: "none" }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffChat;
