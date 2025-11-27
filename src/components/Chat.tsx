import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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
        <path d="M22 2L11 13"/>
        <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
    </svg>
);

const Chat: React.FC<ChatProps> = ({ topicContent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  // Ref for the very bottom of the chat, to scroll to it
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- FIX: Updated System Instruction to encourage Markdown --- //
  const systemInstruction = `أنت مساعد ذكي متخصص في مراجعة وتصحيح النصوص للطلاب. سأعطيك الآن نص الدرس الذي يدرسه الطالب. مهمتك هي الإجابة على أسئلة الطالب المتعلقة بهذا الدرس فقط، وتقديم ملاحظات بناءة، وشرح المفاهيم الصعبة بطريقة مبسطة. استخدم تنسيق الماركداون (Markdown) لجعل إجاباتك أكثر وضوحًا، مثل استخدام **الخط العريض** للعناوين، و *الخط المائل* للمصطلحات، و القوائم النقطية أو الرقمية للشرح. لا تجب عن أي أسئلة خارج سياق هذا الدرس. كن ودوداً ومشجعاً. نص الدرس هو: \n\n---\n${topicContent}\n---"`;

  const { sendMessageToAI, loading, error } = useAI(systemInstruction);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to handle sending a message
  const handleSend = async () => {
    if (input.trim() === '' || loading) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const botResponseText = await sendMessageToAI(input);
    
    if (botResponseText) {
      const botMessage: Message = { sender: 'bot', text: botResponseText };
      setMessages(prev => [...prev, botMessage]);
    }
  };

  // --- FIX: Improved auto-scrolling --- //
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]); // Scroll whenever messages change or loading state changes

  return (
    <div className="chat-wrapper">
      {/* --- FIX: chat-container is now the scrollable area --- */}
      <div className="chat-container">
        {messages.length === 0 && !loading && !error && (
            <div className="chat-empty-state">
                <h3>أهلاً بك!</h3>
                <p>أنا هنا لمساعدتك في مراجعة هذا الدرس. اسألني أي شيء عنه.</p>
            </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            <div className="message-bubble">
              {/* --- FIX: Use ReactMarkdown for bot messages --- */}
              {msg.sender === 'bot' ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>
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
        {/* This empty div is the target for our auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* --- FIX: Restructured input area --- */}
      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="اكتب سؤالك هنا..."
          disabled={loading}
          aria-label="Chat input"
        />
        <button onClick={handleSend} disabled={loading} aria-label="Send message">
          <SendIcon />
        </button>
      </div>
    </div>
  );
};

export default Chat;
