import React, { useState, useRef, useEffect } from 'react';
import './aichatbot.css';

const STORAGE_KEY    = 'ivaccine_ai_chat_history';
const SESSION_KEY    = 'ivaccine_ai_session_id';
const defaultMessage = { text: 'Chào bạn, tôi là trợ lý y tế AI của iVaccine. Tôi có thể giúp gì cho bạn?', isBot: true };

/** Lấy hoặc tạo sessionId — giữ ngữ cảnh hội thoại với backend.
 *  Mỗi tab browser dùng cùng 1 sessionId cho đến khi user xoá chat. */
const getSessionId = () => {
    try {
        let sid = localStorage.getItem(SESSION_KEY);
        if (!sid) {
            sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem(SESSION_KEY, sid);
        }
        return sid;
    } catch { return 'default'; }
};

// Load lịch sử chat từ localStorage
const loadMessages = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {}
    return [defaultMessage];
};

// Lưu lịch sử chat vào localStorage
const saveMessages = (messages) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {}
};

const AIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => loadMessages());
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Lưu vào localStorage mỗi khi messages thay đổi
    useEffect(() => {
        saveMessages(messages);
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Xoá lịch sử chat (cả FE display + BE conversation context)
    const clearChat = async () => {
        const sid = getSessionId();
        setMessages([defaultMessage]);
        localStorage.removeItem(STORAGE_KEY);
        // Báo backend xoá history + tạo sessionId mới cho cuộc sau
        try {
            await fetch('http://localhost:8080/api/chat-ai/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sid }),
            });
        } catch {}
        localStorage.removeItem(SESSION_KEY);
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const userMsg = inputText.trim();
        setMessages(prev => [...prev, { text: userMsg, isBot: false }]);
        setInputText('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8080/api/chat-ai/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userMsg, sessionId: getSessionId() })
            });

            if (response.ok) {
                const textResponse = await response.text();
                setMessages(prev => [...prev, { text: textResponse, isBot: true }]);
            } else {
                setMessages(prev => [...prev, { text: 'Xin lỗi, hiện tại tôi không thể trả lời. Bạn vui lòng thử lại sau.', isBot: true }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { text: 'Xin lỗi, hiện tại tôi không thể trả lời. Bạn vui lòng thử lại sau.', isBot: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ai-chatbot-container">
            {!isOpen && (
                <button className="ai-chatbot-toggle" onClick={() => setIsOpen(true)}>
                    <i className="fa fa-commenting"></i>
                </button>
            )}

            {isOpen && (
                <div className="ai-chatbot-window">
                    <div className="ai-chatbot-header">
                        <div className="ai-chatbot-title">
                            <i className="fa fa-user-md" style={{marginRight: '8px'}}></i>
                            Trợ lý y tế AI
                        </div>
                        <div style={{display: 'flex', gap: '8px'}}>
                            <button className="ai-chatbot-close" onClick={clearChat} title="Xoá lịch sử chat">
                                <i className="fa fa-trash"></i>
                            </button>
                            <button className="ai-chatbot-close" onClick={() => setIsOpen(false)}>
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div className="ai-chatbot-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`ai-message-row ${msg.isBot ? 'bot-row' : 'user-row'}`}>
                                {msg.isBot && <div className="ai-avatar"><i className="fa fa-android"></i></div>}
                                <div className={`ai-message-bubble ${msg.isBot ? 'bot-bubble' : 'user-bubble'}`}>
                                    <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="ai-message-row bot-row">
                                <div className="ai-avatar"><i className="fa fa-android"></i></div>
                                <div className="ai-message-bubble bot-bubble typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="ai-chatbot-input-area">
                        <input 
                            type="text" 
                            placeholder="Nhập câu hỏi của bạn..." 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button onClick={handleSendMessage} disabled={isLoading || !inputText.trim()}>
                            <i className="fa fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIChatbot;
