import { useState } from 'react';
import '../styles/Chat.css';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() === '') return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);

    // Mock bot response
    setTimeout(() => {
      const botMessage: Message = { sender: 'bot', text: `أنا نسخة تجريبية. لم أفهم "${input}".` };
      setMessages(prev => [...prev, botMessage]);
    }, 500);

    setInput('');
  };

  return (
    <div className="chat-widget card">
      <h3>المساعد الذكي</h3>
      <div className="chat-history">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="اسأل عن الكتابة..."
        />
        <button onClick={handleSend}>إرسال</button>
      </div>
    </div>
  );
}
