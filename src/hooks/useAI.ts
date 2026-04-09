import { useState } from 'react';

// Using OpenRouter API
const API_KEY = import.meta.env.VITE_REVIEW_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const FREE_MODELS = [
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'google/gemma-4-26b-a4b-it:free',
  'deepseek/deepseek-chat:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'anthropic/claude-3-haiku:free',
];

// This is the internal format for storing conversation history, based on Gemini's structure.
type History = {
  role: 'user' | 'model';
  parts: { text: string }[];
}[];

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 5
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.ok) {
      return response;
    }
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(Math.pow(2, attempt) * 2000, 30000);
      console.log(`Rate limited. Retry after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      lastError = new Error('Rate limit exceeded');
      continue;
    }
    
    return response;
  }
  
  throw lastError || new Error('Max retries exceeded');
}

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

    const messagesForAPI = [
      { role: 'system', content: systemInstruction },
      ...history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts[0].text
      })),
      { role: 'user', content: message }
    ];

    let lastError: Error | null = null;
    let botResponse: string | null = null;
    
    try {
      for (const model of FREE_MODELS) {
        const requestPayload = {
          model: model,
          messages: messagesForAPI,
        };
        
        try {
          const response = await fetchWithRetry(API_URL, {
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
            console.error(`API Error with ${model}:`, errorData);
            if (response.status === 429) {
              lastError = new Error('Rate limit exceeded');
              continue;
            }
            lastError = new Error(errorData?.error?.message || 'فشل الاتصال بالـ API');
            continue;
          }

          const data = await response.json();
          
          if (!data.choices || !data.choices[0].message.content) {
            console.error("Invalid API response:", data);
            continue;
          }

          botResponse = data.choices[0].message.content;
          break;
          
        } catch (e: any) {
          console.error(`Error with model ${model}:`, e);
          lastError = e;
          continue;
        }
      }
      
      if (!botResponse) {
        throw lastError || new Error('فشل الاتصال بجميع النماذج المتاحة');
      }
         
      const finalBotResponse = botResponse;

      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text: finalBotResponse }] }
      ]);

      return finalBotResponse;

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
