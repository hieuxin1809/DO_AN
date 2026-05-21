import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getMethod, uploadSingleFile } from '../../services/request';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/* ─── Inline styles for dynamically-created DOM elements ── */
const BUBBLE_CSS = `
  #cskh-list p.mychat {
    display: block;
    margin: 4px 0 4px auto;
    max-width: 78%;
    width: fit-content;
    padding: 9px 14px;
    border-radius: 18px 18px 4px 18px;
    background: linear-gradient(135deg, #2A388F, #0ea5e9);
    color: #fff;
    font-size: 13.5px;
    line-height: 1.5;
    word-break: break-word;
  }
  #cskh-list p.adminchat {
    display: block;
    margin: 4px auto 4px 0;
    max-width: 78%;
    width: fit-content;
    padding: 9px 14px;
    border-radius: 18px 18px 18px 4px;
    background: #fff;
    color: #1e293b;
    font-size: 13.5px;
    line-height: 1.5;
    word-break: break-word;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  #cskh-list img.mychatimg {
    display: block;
    margin: 6px 0 6px auto;
    max-width: 78%;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  #cskh-list img.adminchatimg {
    display: block;
    margin: 6px auto 6px 0;
    max-width: 78%;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
`;

/* ── module-level toggle (keeps DOM-based open/close) ──── */
function toggleChat() {
    const chatBox     = document.getElementById('cskh-box');
    const btnOpen     = document.getElementById('cskh-btn-open');
    if (!chatBox) return;
    const isHidden = chatBox.style.display === 'none' || chatBox.style.display === '';
    chatBox.style.display   = isHidden ? 'flex' : 'none';
    btnOpen.style.display   = isHidden ? 'none' : 'flex';
    if (isHidden) {
        const el = document.getElementById('cskh-scroll');
        if (el) el.scrollTop = el.scrollHeight;
    }
}

/* ══════════════════════════════════════════════════════════ */
function ChatFrame() {
    const [itemChat, setItemChat] = useState([]);
    const [client,   setClient]   = useState(null);

    useEffect(() => {
        const el = document.getElementById('cskh-scroll');
        if (el) el.scrollTop = el.scrollHeight;
    }, [itemChat]);

    useEffect(() => {
        var user  = localStorage.getItem('user');
        var email = null;
        if (user != null) {
            try { user = JSON.parse(user); } catch (_) { user = null; }
            if (user) {
                email = user.email;
                // Guard: authorities có thể là object {name}, string, hoặc undefined
                const authName = user?.authorities?.name ?? user?.authorities;
                if (authName === 'Customer') {
                    const getItemChat = async () => {
                        try {
                            var response = await getMethod('/api/chat/customer/my-chat');
                            var result   = await response.json();
                            setItemChat(Array.isArray(result) ? result : []);
                        } catch (err) { console.warn('chat: load failed', err); }
                    };
                    getItemChat();
                }
            }
        }

        const stompClient = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/hello'),
            onConnect: () => {
                stompClient.subscribe('/users/queue/messages', (msg) => {
                    var isFile = msg.headers.isFile;
                    if (Number(isFile) === Number(0)) appendTinNhanDen(msg.body);
                    else                               appendFileTinNhanDen(msg.body);

                    const chatBox = document.getElementById('cskh-box');
                    if (!chatBox || chatBox.style.display === 'none' || chatBox.style.display === '') {
                        toast.info('Bạn có tin nhắn mới từ nhân viên hỗ trợ!');
                    }
                });
            },
            connectHeaders: { username: email },
        });
        stompClient.activate();
        setClient(stompClient);
        return () => stompClient.deactivate();
    }, []);

    /* ── send handlers (unchanged logic) ──────────────── */
    const sendMessage = () => {
        if (client && client.connected) {
            client.publish({ destination: '/app/hello/-10', body: document.getElementById('cskh-input').value });
            append();
        } else {
            toast.warning('Hệ thống chat chưa kết nối, vui lòng thử lại sau!');
        }
    };

    const sendFileMessage = async () => {
        const file = document.getElementById('cskh-file').files[0];
        if (file && !isImageFile(file)) { toast.warning('Đây không phải là file ảnh'); return; }
        var link = await uploadSingleFile(document.getElementById('cskh-file'));
        if (client && client.connected) {
            appendFile(link);
            client.publish({ destination: '/app/file/-10/' + document.getElementById('cskh-file').files[0].name, body: link });
        } else {
            toast.warning('Hệ thống chat chưa kết nối, vui lòng thử lại sau!');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    /* ── DOM append helpers (unchanged logic) ─────────── */
    function append() {
        const el = document.createElement('p');
        el.className   = 'mychat';
        el.textContent = document.getElementById('cskh-input').value;
        document.getElementById('cskh-list').appendChild(el);
        const s = document.getElementById('cskh-scroll');
        s.scrollTop = s.scrollHeight;
        document.getElementById('cskh-input').value = '';
    }
    function appendFile(link) {
        const el = document.createElement('img');
        el.className = 'mychatimg'; el.src = link;
        document.getElementById('cskh-list').appendChild(el);
        const s = document.getElementById('cskh-scroll'); s.scrollTop = s.scrollHeight;
    }
    function appendTinNhanDen(mess) {
        const el = document.createElement('p');
        el.className = 'adminchat'; el.textContent = mess;
        document.getElementById('cskh-list').appendChild(el);
        const s = document.getElementById('cskh-scroll'); s.scrollTop = s.scrollHeight;
    }
    function appendFileTinNhanDen(mess) {
        const el = document.createElement('img');
        el.className = 'adminchatimg'; el.src = mess;
        document.getElementById('cskh-list').appendChild(el);
        const s = document.getElementById('cskh-scroll'); s.scrollTop = s.scrollHeight;
    }
    function isImageFile(file) { return file.type.startsWith('image/'); }

    /* ── guard: only render for logged-in users ───────── */
    if (!localStorage.getItem('token')) return null;

    return (
        <>
            {/* inject bubble styles */}
            <style>{BUBBLE_CSS}</style>

            <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 9998, fontFamily: "'Quicksand', sans-serif" }}>

                {/* ── Toggle button ───────────────────── */}
                <button
                    id="cskh-btn-open"
                    type="button"
                    onClick={toggleChat}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px 18px', borderRadius: '50px',
                        background: 'linear-gradient(135deg, #2A388F, #0ea5e9)',
                        color: '#fff', border: 'none', cursor: 'pointer',
                        fontSize: '14px', fontWeight: '700',
                        boxShadow: '0 4px 16px rgba(14,165,233,0.45)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(14,165,233,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(14,165,233,0.45)'; }}
                >
                    {/* headset SVG icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
                        <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                    </svg>
                    Hỗ trợ
                </button>

                {/* ── Chat window ─────────────────────── */}
                <div
                    id="cskh-box"
                    style={{
                        display: 'none', flexDirection: 'column',
                        width: '340px', height: '480px',
                        background: '#fff', borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        overflow: 'hidden',
                        position: 'absolute', bottom: '60px', left: '0',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #2A388F 0%, #0ea5e9 100%)',
                        padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* avatar */}
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '18px', flexShrink: 0,
                            }}>
                                🎧
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px', lineHeight: 1.2 }}>
                                    Nhân viên CSKH
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}/>
                                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11.5px' }}>Trực tuyến</span>
                                </div>
                            </div>
                        </div>
                        {/* close button */}
                        <button
                            onClick={toggleChat}
                            style={{
                                background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '8px',
                                color: '#fff', width: '30px', height: '30px', cursor: 'pointer',
                                fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Message area */}
                    <div
                        id="cskh-scroll"
                        style={{
                            flex: 1, overflowY: 'auto', padding: '14px 12px',
                            background: '#f0f4f8',
                            display: 'flex', flexDirection: 'column',
                        }}
                    >
                        <div id="cskh-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {itemChat.map((item, index) => {
                                const isMe = item.sender.authorities.name === 'Customer';
                                if (!item.isFile) {
                                    return (
                                        <p
                                            key={index}
                                            className={isMe ? 'mychat' : 'adminchat'}
                                        >
                                            {item.content}
                                        </p>
                                    );
                                } else {
                                    return (
                                        <img
                                            key={index}
                                            className={isMe ? 'mychatimg' : 'adminchatimg'}
                                            src={item.content}
                                            alt=""
                                        />
                                    );
                                }
                            })}
                        </div>
                    </div>

                    {/* Input area */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 12px', background: '#fff',
                        borderTop: '1px solid #e2e8f0', flexShrink: 0,
                    }}>
                        {/* image attach */}
                        <button
                            type="button"
                            onClick={() => document.getElementById('cskh-file').click()}
                            style={{
                                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                background: '#f0f4f8', border: '1.5px solid #e2e8f0',
                                cursor: 'pointer', fontSize: '15px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#64748b',
                            }}
                            title="Gửi ảnh"
                        >
                            🖼
                        </button>
                        <input
                            id="cskh-file"
                            type="file"
                            onChange={sendFileMessage}
                            style={{ display: 'none' }}
                        />

                        {/* text input */}
                        <input
                            id="cskh-input"
                            type="text"
                            placeholder="Nhập tin nhắn..."
                            onKeyDown={handleKeyDown}
                            style={{
                                flex: 1, padding: '9px 14px', borderRadius: '20px',
                                border: '1.5px solid #e2e8f0', outline: 'none',
                                fontSize: '13.5px', background: '#f8fafc',
                                fontFamily: 'inherit',
                            }}
                            onFocus={e  => e.target.style.borderColor = '#0ea5e9'}
                            onBlur={e   => e.target.style.borderColor = '#e2e8f0'}
                        />

                        {/* send button */}
                        <button
                            onClick={sendMessage}
                            style={{
                                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #2A388F, #0ea5e9)',
                                border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(14,165,233,0.4)',
                            }}
                        >
                            ➤
                        </button>
                    </div>
                </div>

            </div>
        </>
    );
}

export default ChatFrame;
