import { useState } from 'react';

// Using OpenRouter API
const API_KEY = import.meta.env.VITE_REVIEW_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// This is the internal format for storing conversation history, based on Gemini's structure.
type History = {
  role: 'user' | 'model';
  parts: { text: string }[];
}[];

export const useAI = (systemInstruction: string) => {
  const [history, setHistory] = useState<History>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessageToAI = async (message: string) => {
    if (!API_KEY) {
      const errorMessage = "مفتاح OpenRouter API غير موجود. يرجى إضافته في ملف .env باسم VITE_REVIEW_API_KEY";
      setError(errorMessage);
      return errorMessage;
    }

    setLoading(true);
    setError(null);

    // Convert internal history to the format required by OpenRouter (similar to OpenAI)
    const messagesForAPI = [
        { role: 'system', content: systemInstruction },
        ...history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user', // API expects 'assistant' for model responses
            content: h.parts[0].text
        })),
        { role: 'user', content: message }
    ];

    const requestPayload = {
      // FINAL FIX: Using a reliable and confirmed free model from Google.
      model: 'nvidia/nemotron-3-nano-30b-a3b:free',
      messages: messagesForAPI,
    };
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173', 
          'X-Title': 'Midad', 
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        const apiErrorMessage = errorData?.error?.message || 'فشل الاتصال بالـ API. تأكد من أن المفتاح صحيح وأن النموذج متاح.';
        throw new Error(apiErrorMessage);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0].message.content) {
        console.error("Invalid API response:", data);
        throw new Error('تم استلام رد غير متوقع من الخادم.');
      }

      const botResponse = data.choices[0].message.content;
      
      // Update internal history
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text: botResponse }] }
      ]);

      return botResponse;

    } catch (e: any) {
      console.error(e);
      const errorMessage = `عذراً، حدث خطأ: ${e.message}`;
      setError(errorMessage);
      return errorMessage;
    } finally {
      setLoading(false);
    }
  };

  return { sendMessageToAI, loading, error };
};
