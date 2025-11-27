import React, { useState, useEffect, useRef } from 'react';
import { useAI } from '../hooks/useAI';
import '../styles/Chat.css';

interface ChatProps {
  topicContent: string; // The content of the lesson/topic
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

// --- SVG Icons --- //
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

const Chat: React.FC<ChatProps> = ({ topicContent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Create the system instruction for the AI
  const systemInstruction = `أنت مساعد ذكي متخصص في مراجعة وتصحيح النصوص للطلاب. سأعطيك الآن نص الدرس الذي يدرسه الطالب. مهمتك هي الإجابة على أسئلة الطالب المتعلقة بهذا الدرس فقط، وتقديم ملاحظات بناءة، وشرح المفاهيم الصعبة بطريقة مبسطة. لا تجب عن أي أسئلة خارج سياق هذا الدرس. كن ودوداً ومشجعاً. نص الدرس هو: \n\n---\n${topicContent}\n---"`;

  const { sendMessageToAI, loading, error } = useAI(systemInstruction);

  // Function to handle sending a message
  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const botResponseText = await sendMessageToAI(input);
    
    if (botResponseText) {
      const botMessage: Message = { sender: 'bot', text: botResponseText };
      setMessages(prev => [...prev, botMessage]);
    }
  };

  // Auto-scroll to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-wrapper">
      <div className="chat-container" ref={chatContainerRef}>
        {messages.length === 0 && (
            <div className="chat-empty-state">
                <p>أهلاً بك! أنا هنا لمساعدتك في مراجعة الدرس. اسألني أي شيء عنه.</p>
            </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            <div className="message-bubble">{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-message bot">
            <div className="message-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        {error && (
            <div className="chat-error-state">
                <p>{error}</p>
            </div>
        )}
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
          placeholder="اكتب سؤالك هنا..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
};

export default Chat;
