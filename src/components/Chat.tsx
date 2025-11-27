import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Chat.css";

type Message = {
  sender: "user" | "bot";
  text: string;
};

// تحديث الخصائص لاستقبال topicId
type ChatProps = {
  topicId?: string;
};

export default function Chat({ topicId }: ChatProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "أهلاً بك! كيف يمكنني مساعدتك في فهم هذا الموضوع؟" },
  ]);

  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newUserMessage: Message = {
      sender: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");

    // ... (نفس منطق إرسال الرسالة)
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
      <div className="chat-widget">
        <div className="chat-history">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.sender === "user" ? "bot" : "user"}`}>
              {msg.text}
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            type="text"
            placeholder="اكتب سؤالك هنا..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button onClick={sendMessage}>إرسال</button>
        </div>
      </div>

      {/* زر العودة إلى صفحة المراجعة */}
      {topicId && (
        <div className="chat-actions" style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            className="button button-light"
            onClick={() => navigate(`/lesson-review/${topicId}`)}
          >
            العودة إلى المراجعة
          </button>
        </div>
      )}
    </div>
  );
}
