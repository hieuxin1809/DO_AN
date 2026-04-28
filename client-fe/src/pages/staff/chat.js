import { useState, useEffect } from "react";
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

  const extractHeaderValue = (headerValue) => {
    if (Array.isArray(headerValue)) {
      return headerValue[0];
    }
    return headerValue;
  };

  const normalizeSenderId = (rawSender) => {
    if (rawSender === undefined || rawSender === null) {
      return null;
    }
    const senderStr = String(rawSender);
    const match = senderStr.match(/\d+/);
    return match ? match[0] : null;
  };

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
      setItemChat([]);
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
      setItemUser([]);
    }
  };

  useEffect(() => {
    const listChatAdmin = document.getElementById("listchatadmin");
    if (listChatAdmin) {
      listChatAdmin.scrollTop = listChatAdmin.scrollHeight;
    }
  }, [itemChat]);

  useEffect(() => {
    const initPageData = async () => {
      await loadUserChatList();
      const uls = new URL(document.URL);
      const id = uls.searchParams.get("user");
      const emailFromUrl = uls.searchParams.get("email");
      if (id && emailFromUrl) {
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
        stompClient.subscribe("/users/queue/messages", async (msg) => {
          const nativeHeaders = msg.headers?.nativeHeaders || {};
          const senderHeader = extractHeaderValue(
            msg.headers.sender ?? nativeHeaders.sender
          );
          const senderId = normalizeSenderId(senderHeader);

          const uls = new URL(document.URL);
          const currentUserId = uls.searchParams.get("user");

          if (currentUserId && (!senderId || String(senderId) === String(currentUserId))) {
            await loadChatByUserId(currentUserId);
            setTimeout(() => {
              const listChatAdmin = document.getElementById("listchatadmin");
              if (listChatAdmin) {
                listChatAdmin.scrollTop = listChatAdmin.scrollHeight;
              }
            }, 100);
          } else {
            toast.info("Báº¡n cÃ³ tin nháº¯n má»›i!");
            if (senderId) {
              setNewMessagesCount((prevCount) => ({
                ...prevCount,
                [senderId]: (prevCount[senderId] || 0) + 1,
              }));
            }
          }

          await loadUserChatList();
        });
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
    const uls = new URL(document.URL);
    const id = uls.searchParams.get("user");
    const messageContent = document.getElementById("contentmess").value;
    const userlc = localStorage.getItem("user");
    const userEmail = userlc ? JSON.parse(userlc)?.email : null;

    if (client && client.connected && id && messageContent.trim()) {
      client.publish({
        destination: `/app/hello/${id}`,
        body: messageContent,
      });

      const newMessage = {
        sender: userEmail,
        content: messageContent,
        isFile: false,
      };

      setItemChat((prevChat) => [...(Array.isArray(prevChat) ? prevChat : []), newMessage]);
      setTimeout(() => {
        const listChatAdmin = document.getElementById("listchatadmin");
        if (listChatAdmin) {
          listChatAdmin.scrollTop = listChatAdmin.scrollHeight;
        }
      }, 100);

      setItemUser((prevUsers) => {
        if (!Array.isArray(prevUsers)) return prevUsers;
        const newUsers = [...prevUsers];
        const rcIndex = newUsers.findIndex((u) => String(u?.user?.id) === String(id));
        if (rcIndex > -1) {
          const [rcObj] = newUsers.splice(rcIndex, 1);
          newUsers.unshift(rcObj);
        }
        return newUsers;
      });

      document.getElementById("contentmess").value = "";
    }
  };

  async function loadMessage(user) {
    if (!user || !user.id) {
      console.error("Invalid user object passed to loadMessage:", user);
      return;
    }

    try {
      setNewMessagesCount((prevState) => {
        const newState = { ...prevState };
        delete newState[user.id];
        return newState;
      });

      window.location.href = `chat?user=${user.id}&email=${user.email}`;
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  const sendFileMessage = async () => {
    const fileInput = document.getElementById("btnsendfile");
    const file = fileInput?.files?.[0];
    if (!file) return;
    const userlc = localStorage.getItem("user");
    const userEmail = userlc ? JSON.parse(userlc)?.email : null;

    try {
      const link = await uploadSingleFile(fileInput);
      const uls = new URL(document.URL);
      const id = uls.searchParams.get("user");

      if (client && client.connected && id) {
        client.publish({
          destination: `/app/file/${id}/${file.name}`,
          body: link,
        });

        const newMessage = {
          sender: userEmail,
          content: link,
          isFile: true,
        };

        setItemChat((prevChat) => [...(Array.isArray(prevChat) ? prevChat : []), newMessage]);
        setTimeout(() => {
          const listChatAdmin = document.getElementById("listchatadmin");
          if (listChatAdmin) {
            listChatAdmin.scrollTop = listChatAdmin.scrollHeight;
          }
        }, 100);

        setItemUser((prevUsers) => {
          if (!Array.isArray(prevUsers)) return prevUsers;
          const newUsers = [...prevUsers];
          const rcIndex = newUsers.findIndex((u) => String(u?.user?.id) === String(id));
          if (rcIndex > -1) {
            const [rcObj] = newUsers.splice(rcIndex, 1);
            newUsers.unshift(rcObj);
          }
          return newUsers;
        });
      }

      fileInput.value = "";
    } catch (error) {
      console.error("Error sending file:", error);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
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
          {Array.isArray(itemUser) && itemUser.map((item, index) => {
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
              <button
                onClick={sendMessage}
                className={styles.sendButton}
                id="sendmess"
              >
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
