import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAI } from '../hooks/useAI';
import '../styles/Chat.css';

interface ChatProps {
  topicContent: string;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
);

const Chat: React.FC<ChatProps> = ({ topicContent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const systemInstruction = `أنت مساعد تعليمي عربي متخصص في شرح الدرس ومراجعة فهم الطالب.

المصدر الوحيد المعتمد لك هو بيانات الدرس الموجودة بين الفاصلين أدناه. لا تستخدم معرفة خارجية، ولا تخترع معلومات غير موجودة في هذا المحتوى.

مهامك:
- أجب فقط عن الأسئلة المرتبطة بالدرس الحالي.
- اشرح المفاهيم الصعبة بلغة عربية فصحى مبسطة.
- اعتمد على خطوات الدرس، نموذج الكتابة، أسئلة المراجعة، ومهمة التقييم عند الإجابة.
- إذا طلب الطالب مساعدة في الكتابة، فابن التوجيه على نموذج الدرس ومتطلباته.
- إذا كان السؤال خارج الدرس أو لم توجد له إجابة صريحة في البيانات، فقل ذلك بوضوح ثم وجّه الطالب إلى أقرب جزء مفيد من الدرس.

قواعد الإجابة:
- كن مباشرًا وعمليًا ومشجعًا.
- استخدم Markdown بشكل خفيف عند الحاجة.
- من الأفضل الإشارة إلى الجزء الذي تعتمد عليه مثل: "في خطوات الدرس" أو "في نموذج الكتابة".
- لا تجب عن الأسئلة العامة وكأنها جزء من هذا الدرس.

بيانات الدرس:
---
${topicContent}
---`;

  const { sendMessageToAI, loading, error } = useAI(systemInstruction);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (input.trim() === '' || loading) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    const botResponseText = await sendMessageToAI(input);

    if (botResponseText) {
      const botMessage: Message = { sender: 'bot', text: botResponseText };
      setMessages((prev) => [...prev, botMessage]);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  return (
    <div className="chat-wrapper">
      <div className="chat-container">
        {messages.length === 0 && !loading && !error && (
          <div className="chat-empty-state">
            <h3>أهلًا بك!</h3>
            <p>أنا هنا لمساعدتك في مراجعة هذا الدرس. اسألني أي شيء مرتبط به.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            <div className="message-bubble">
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

        <div ref={messagesEndRef} />
      </div>

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
