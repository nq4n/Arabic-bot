import type { Rubric, RubricCriterion, RubricLevel } from "../data/rubrics";

// This defines the shape of the JSON response we expect from the AI.
export type AIResponseType = {
  score: number;
  feedback: string;
  suggestions: string[];
  rubric_breakdown: {
    [key: string]: {
      score: number;
      feedback: string;
    };
  };
};

/**
 * Builds the system prompt to guide the AI's evaluation.
 * @param rubric The rubric for the specific topic.
 * @returns A string containing the detailed system prompt.
 */
const buildSystemPrompt = (rubric: Rubric): string => {
  const criteriaList = rubric.criteria
    .map((c: RubricCriterion) => {
      const maxScore =
        c.levels.find((l: RubricLevel) => l.id === "excellent")?.score ??
        Math.max(...c.levels.map((l) => l.score));
      return `- ${c.name} (ID: ${c.id}, Max Score: ${maxScore})`;
    })
    .join("\n");

  const totalScore = rubric.criteria.reduce((sum: number, c: RubricCriterion) => {
    const maxScore =
      c.levels.find((l: RubricLevel) => l.id === "excellent")?.score ??
      Math.max(...c.levels.map((l) => l.score));
    return sum + maxScore;
  }, 0);

  const firstId = rubric.criteria[0]?.id ?? "criterion_1";
  const secondId = rubric.criteria[1]?.id ?? "criterion_2";

  return `
أنت مساعد خبير في تقويم الكتابة العربية. مهمتك هي تقييم النص الذي يقدمه المستخدم بناءً على المعايير المحددة وإرجاع النتيجة بتنسيق JSON حصريًا.

**معايير التقييم (المجموع الكلي المحتمل: ${totalScore} نقطة):**
${criteriaList}

**تنسيق الإخراج المطلوب (JSON فقط):**
الرجاء إرجاع كائن JSON صالح يحتوي على الحقول التالية:
- \`score\`: رقم يمثل مجموع النقاط التي حصل عليها الطالب (من ${totalScore}).
- \`feedback\`: سلسلة نصية تحتوي على ملاحظات عامة وبناءة حول النص.
- \`suggestions\`: مصفوفة من السلاسل النصية، كل سلسلة هي اقتراح لتحسين النص.
- \`rubric_breakdown\`: كائن (object) حيث كل مفتاح هو \`id\` أحد المعايير (مثل '${firstId}', '${secondId}', إلخ). يجب أن تكون قيمة كل مفتاح كائنًا آخر يحتوي على:
  - \`score\`: رقم يمثل النقاط الممنوحة لهذا المعيار.
  - \`feedback\`: سلسلة نصية قصيرة تبرر النقاط الممنوحة لهذا المعيار المحدد.

**قواعد مهمة جداً:**
1.  **JSON فقط:** يجب أن تكون الاستجابة بأكملها عبارة عن كائن JSON صالح بدون أي نص إضافي قبله أو بعده. لا تستخدم علامات markdown مثل \`\`\`json.
2.  **دقة الحساب:** يجب أن يكون الحقل \`score\` الإجمالي هو المجموع الدقيق لجميع حقول \`score\` داخل \`rubric_breakdown\`.
3.  **التقييم الموضوعي:** قم بتقييم النص بشكل عادل وموضوعي بناءً على المعايير المقدمة.
`.trim();
};

/**
 * Combines multiple writing fields into a single string for the AI.
 * @param writingValues An object containing the text from different writing sections.
 * @returns A single formatted string.
 */
const combineWritingValues = (writingValues: { [key: string]: string }): string => {
  return Object.entries(writingValues)
    .map(([key, value]: [string, string]) => `--- ${key.toUpperCase()} ---\n${value}`)
    .join("\n\n");
};

/**
 * Calls the OpenAI API to get a rubric-based evaluation for the given text.
 * @param writingValues The student's written text.
 * @param rubric The rubric to evaluate against.
 * @returns A promise that resolves to the AI's structured feedback.
 */
export const getAIAnalysis = async (
  writingValues: { [key: string]: string },
  rubric: Rubric
): Promise<AIResponseType> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error("OpenAI API key is missing.");
    throw new Error("VITE_OPENAI_API_KEY is not configured in your .env file.");
  }

  const systemPrompt = buildSystemPrompt(rubric);
  const userContent = combineWritingValues(writingValues);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("AI API Error:", response.status, errorBody);
      throw new Error(`AI API request failed with status ${response.status}`);
    }

    const result = await response.json();
    const content = JSON.parse(result.choices[0].message.content);

    return content as AIResponseType;
  } catch (error) {
    console.error("Failed to get AI analysis:", error);
    throw new Error("The AI evaluation process failed. Please try again.");
  }
};
