export function useAI() {
  async function getPredefinedBotResponse(questionId: string) {
    console.log(`Getting response for questionId: ${questionId}`);
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      answer: "هذا جواب وهمي من البوت المحدد مسبقًا."
    };
  }

  async function chatWithAI(message: string) {
    console.log(`Sending message to AI: ${message}`);
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      response: "هذا رد وهمي من الذكاء الاصطناعي."
    };
  }

  async function evaluateWriting(text: string, topicId: string) {
    console.log(`Evaluating text for topicId: ${topicId}`, text);
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      score: 85,
      feedback: [
        { error: "الكلمة", suggestion: "كلمة بديلة" },
        { error: "الجملة الطويلة جدًا", suggestion: "حاول تقسيم الجملة" }
      ],
      suggestedVersion: "هذه هي النسخة المقترحة والمحسنة من النص الذي كتبته."
    };
  }

  return { getPredefinedBotResponse, chatWithAI, evaluateWriting };
}
