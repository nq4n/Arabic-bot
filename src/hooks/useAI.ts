export type MockEvaluation = {
  score: number;
  feedback: string[];
  suggestedVersion: string;
};

export function useAI() {
  async function getPredefinedBotResponse(questionId: string): Promise<string> {
    console.log(`Fetching answer for question: ${questionId}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return `هذا هو الجواب المحدد مسبقًا للسؤال رقم ${questionId}.`;
  }

  async function chatWithAI(message: string): Promise<string> {
    console.log(`Sending message to AI: ${message}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "هذه إجابة وهمية من الذكاء الاصطناعي. كيف يمكنني مساعدتك أكثر؟";
  }

  async function evaluateWriting(text: string, topicId: string): Promise<MockEvaluation> {
    console.log(`Evaluating text for topic: ${topicId}`);
    console.log(text);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      score: 85,
      feedback: [
        'الجملة الأولى قوية ومباشرة.',
        'حاول استخدام مفردات أكثر تنوعًا في الفقرة الثانية.',
        'النهاية كانت ضعيفة بعض الشيء، يمكنك تحسينها.'
      ],
      suggestedVersion: text.replace('ضعيفة', 'قوية') + '\n\n هذه هي النسخة المقترحة من الذكاء الاصطناعي.'
    };
  }

  return { getPredefinedBotResponse, chatWithAI, evaluateWriting };
}
