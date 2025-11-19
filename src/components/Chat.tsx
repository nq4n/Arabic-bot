import React, { useState } from "react";
import "../styles/Chat.css"; // يستخدم الكلاسات الموجودة عندك

export default function Chat() {
  const [messages, setMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([
    { sender: "bot", text: "مرحباً! كيف أستطيع مساعدتك في فهم الموضوع؟" },
  ]);

  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    const newUserMessage = {
      sender: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    // رد افتراضي (AI mock)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "تم استلام رسالتك! سأعمل على مساعدتك.",
        },
      ]);
    }, 500);

    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>الدردشة مع الذكاء الاصطناعي</h2>

      <div className="chat-widget">
        {/* History */}
        <div className="chat-history">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.sender === "user" ? "user" : "bot"}`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="chat-input">
          <input
            type="text"
            placeholder="اكتب سؤالك هنا..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />

          <button onClick={sendMessage}>
            إرسال
          </button>
        </div>
      </div>
    </div>
  );
}
