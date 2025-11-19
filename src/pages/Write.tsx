import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAI } from '../hooks/useAI';
import { useWritingTools } from '../hooks/useWritingTools';
import '../styles/Write.css';
import Evaluation from '../components/Evaluation';
import Chat from '../components/Chat';
import type { MockEvaluation } from '../hooks/useAI';

const WritingPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const [text, setText] = useState('');
  const { evaluateWriting } = useAI();
  const { countWords, countSentences } = useWritingTools();
  const [evaluation, setEvaluation] = useState<MockEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEvaluate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    const result = await evaluateWriting(text, topicId || 'unknown');
    setEvaluation(result);
    setIsLoading(false);
  };

  return (
    <div className="write-page">
      <div className="editor-container card">
        <h1 className="editor-title">اكتب مقالك هنا</h1>
        <textarea 
          className="editor-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='ابدأ الكتابة...'
        />
        <div className="editor-toolbar">
          <div className="stats">
            <span>الكلمات: {countWords(text)}</span>
            <span>الجمل: {countSentences(text)}</span>
          </div>
          <button onClick={handleEvaluate} disabled={isLoading} className="button">
            {isLoading ? '...جاري التقييم' : 'قيّم النص'}
          </button>
        </div>
      </div>

      <div className="sidebar">
        {evaluation ? <Evaluation evaluation={evaluation} /> : <Chat />}
      </div>
    </div>
  );
};

export default WritingPage;
