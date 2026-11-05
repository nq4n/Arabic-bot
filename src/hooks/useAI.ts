import { useState } from 'react';
import { supabase } from '../supabaseClient';

// Chat now goes through the `ai-chat` Supabase edge function, which holds the
// OpenRouter key server-side. The key is never shipped to the browser, so it
// can't be extracted, and the function gates access to logged-in users and
// handles retries/fallback — which is what lets this scale to many users.

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

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-chat', {
        body: { messages: messagesForAPI },
      });

      if (fnError || !data?.success || !data?.content) {
        throw new Error(
          (data as { error?: string } | null)?.error || 'فشل الاتصال بالمساعد'
        );
      }

      const finalBotResponse = data.content as string;

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
