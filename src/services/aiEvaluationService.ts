import type { WritingSection } from "../data/topics";
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
 * Builds the system prompt to guide the AI\'s evaluation.
 * @param rubric The rubric for the specific topic.
 * @returns A string containing the detailed system prompt.
 */
const buildSystemPrompt = (
  rubric: Rubric,
  context?: {
    topicTitle?: string;
    evaluationTask?: string;
    evaluationMode?: "writing" | "discussion" | "report" | "dialogue";
  }
): string => {
  // Simplified and safer score calculation
  const criteriaList = rubric.criteria
    .map((c: RubricCriterion) => {
      // Use a default max score if 'excellent' is not found
      const maxScore = c.levels.find((l: RubricLevel) => l.id === 'excellent')?.score || 5;
      return `- ${c.name} (ID: ${c.id}, Max Score: ${maxScore})`;
    })
    .join('\\n');

  const criteriaDetails = rubric.criteria
    .map((criterion) => {
      const levels = criterion.levels
        .map((level) => `  - ${level.label} (${level.score}): ${level.description}`)
        .join('\\n');
      return `- ${criterion.name} (ID: ${criterion.id}): ${criterion.description}\\n${levels}`;
    })
    .join('\\n');

  const totalScore = rubric.criteria.reduce((sum: number, c: RubricCriterion) => {
    const maxScore = c.levels.find((l: RubricLevel) => l.id === 'excellent')?.score || 5;
    return sum + maxScore;
  }, 0);

  const firstId = rubric.criteria[0]?.id ?? 'criterion_1';
  const secondId = rubric.criteria[1]?.id ?? 'criterion_2';
  const modeGuidance = context?.evaluationMode
    ? `**طبيعة المهمة:** ركّز في التقييم على خصائص "${context.evaluationMode}"، مثل ${
        context.evaluationMode === "discussion"
          ? "قوة الحجة، احترام الرأي الآخر، وترتيب الأفكار المنطقية."
          : context.evaluationMode === "dialogue"
            ? "طبيعية الحوار، وضوح الأصوات، وتسلسل تبادل الكلام."
            : context.evaluationMode === "report"
              ? "الوضوح والموضوعية والتنظيم وفق هيكل التقرير."
              : "سلامة التعبير والأسلوب وتسلسل الأفكار."
      }`
    : "";

  return `
أنت معلم لغة عربية خبير ومحترف في تقويم الكتابة. مهمتك هي تقييم النص الذي يقدمه المستخدم بناءً على المعايير المحددة وإرجاع النتيجة بتنسيق JSON حصريًا.

${context?.topicTitle ? `**عنوان الدرس:** ${context.topicTitle}` : ""}
${context?.evaluationTask ? `**مهمة التقييم الخاصة بالدرس:** ${context.evaluationTask}` : ""}
${modeGuidance}

**معايير التقييم (المجموع الكلي المحتمل: ${totalScore} نقطة):**
${criteriaList}

**تفاصيل المعايير ومستوياتها:**
${criteriaDetails}

**تنسيق الإخراج المطلوب (JSON فقط):**
الرجاء إرجاع كائن JSON صالح يحتوي على الحقول التالية:
- \`score\`: رقم يمثل مجموع النقاط التي حصل عليها الطالب (من ${totalScore}).
- \`feedback\`: سلسلة نصية تحتوي على ملاحظات عامة وبناءة حول النص، بأسلوب إنساني ودود يذكر نقاط القوة ثم جوانب التحسين.
- \`suggestions\`: مصفوفة من السلاسل النصية، كل سلسلة هي اقتراح لتحسين النص.
- \`rubric_breakdown\`: كائن (object) حيث كل مفتاح هو \`id\` أحد المعايير (مثل '${firstId}', '${secondId}', إلخ). يجب أن تكون قيمة كل مفتاح كائنًا آخر يحتوي على:
  - \`score\`: رقم يمثل النقاط الممنوحة لهذا المعيار.
  - \`feedback\`: سلسلة نصية قصيرة تبرر النقاط الممنوحة لهذا المعيار المحدد مع الإشارة إلى مستوى الأداء الأقرب (مثل ممتاز/جيد/مقبول/ضعيف).

**قواعد مهمة جداً:**
1.  **مخرج JSON فقط، بدون نص إضافي:** يجب أن تكون الاستجابة بأكملها عبارة عن كائن JSON صالح حصراً. لا تقم بإضافة أي نص تمهيدي، تفسيرات، أو أي محتوى آخر قبل أو بعد الـ JSON. لا تستخدم علامات markdown مثل \`\`\`json.
2.  **دقة الحساب:** يجب أن يكون الحقل \`score\` الإجمالي هو المجموع الدقيق لجميع حقول \`score\` داخل \`rubric_breakdown\`.
3.  **التقييم الموضوعي:** قم بتقييم النص بشكل عادل وموضوعي بناءً على المعايير المقدمة.
4.  **الأسلوب التعليمي والواضح:** استخدم لغة بشرية واضحة، بناءة، ومشجعة. قدّم ملاحظات تفصيلية ومرتبطة مباشرة بالمعايير، مع ذكر جوانب القوة أولاً ثم اقتراح التحسينات بأسلوب المعلم الخبير.
5.  **التقييم الواقعي للمحتوى:** إذا كان النص المقدم قصيراً جداً، أو غير مكتمل، أو لا يتصل بالمهمة المطلوبة، يجب أن ينعكس ذلك بوضوح في الدرجات الممنوحة وفي الملاحظات، حيث يجب أن تكون الدرجات منخفضة بشكل مناسب. تذكر أنك تقوم بالتقييم كما يفعل معلم بشري.
  `.trim();
};

/**
 * Combines multiple writing fields into a single string for the AI.
 * @param writingValues An object containing the text from different writing sections.
 * @returns A single formatted string.
 */
const combineWritingValues = (
  writingValues: { [key: string]: string },
  sections?: WritingSection[]
): string => {
  return Object.entries(writingValues)
    .map(([key, value]) => {
      const sectionTitle = sections?.find((section) => section.id === key)?.title;
      const label = sectionTitle ? `${sectionTitle} (${key})` : key.toUpperCase();
      return `--- ${label} ---\\n${value}`;
    })
    .join('\\n\\n');
};

/**
 * Calls the OpenAI API to get a rubric-based evaluation for the given text.
 * @param writingValues The student\'s written text.
 * @param rubric The rubric to evaluate against.
 * @returns A promise that resolves to the AI\'s structured feedback.
 */
export const getAIAnalysis = async (
  writingValues: { [key: string]: string },
  rubric: Rubric,
  context?: {
    topicTitle?: string;
    evaluationTask?: string;
    evaluationMode?: "writing" | "discussion" | "report" | "dialogue";
    writingSections?: WritingSection[];
  }
): Promise<AIResponseType> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error('OpenAI API key is missing.');
    throw new Error('VITE_OPENAI_API_KEY is not configured in your .env file.');
  }

  const systemPrompt = buildSystemPrompt(rubric, context);
  const userContent = combineWritingValues(writingValues, context?.writingSections);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('AI API Error:', response.status, errorBody);
      throw new Error(`AI API request failed with status ${response.status}`);
    }

    const result = await response.json();
    const messageContent = result.choices[0].message.content;

    // Robustly handle the AI response, which might be a string or an object
    let content: AIResponseType;
    if (typeof messageContent === 'string') {
      try {
        content = JSON.parse(messageContent);
      } catch (e) {
        console.error("Failed to parse AI response content:", e);
        throw new Error("The AI returned an invalid JSON response.");
      }
    } else if (typeof messageContent === 'object' && messageContent !== null) {
      content = messageContent; // It's already an object
    } else {
      console.error("Unexpected AI response format:", messageContent);
      throw new Error("The AI returned an unexpected response format.");
    }

    return content;

  } catch (error) {
    console.error('Failed to get AI analysis:', error);
    // Provide a more user-friendly error message
    throw new Error('The AI evaluation process failed. Please check your connection or API key and try again.');
  }
};
