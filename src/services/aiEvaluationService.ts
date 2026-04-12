import type { WritingSection } from "../data/topics";
import type { Rubric, RubricCriterion, RubricLevel } from "../data/rubrics";

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

const buildSystemPrompt = (
  rubric: Rubric,
  context?: {
    topicTitle?: string;
    evaluationTask?: string;
    evaluationMode?: "writing" | "discussion" | "report" | "dialogue";
    studentName?: string;
    studentGrade?: string;
    lessonContext?: string;
  }
): string => {
  const criteriaList = rubric.criteria
    .map((criterion: RubricCriterion) => {
      const maxScore =
        criterion.levels.find((level: RubricLevel) => level.id === "excellent")?.score ?? 5;
      return `- ${criterion.name} (ID: ${criterion.id}, Max Score: ${maxScore})`;
    })
    .join("\n");

  const criteriaDetails = rubric.criteria
    .map((criterion) => {
      const levels = criterion.levels
        .map((level) => `  - ${level.label} (${level.score}): ${level.description}`)
        .join("\n");
      return `- ${criterion.name} (ID: ${criterion.id}): ${criterion.description}\n${levels}`;
    })
    .join("\n");

  const totalScore = rubric.criteria.reduce((sum: number, criterion: RubricCriterion) => {
    const maxScore =
      criterion.levels.find((level: RubricLevel) => level.id === "excellent")?.score ?? 5;
    return sum + maxScore;
  }, 0);

  const criterionIds = rubric.criteria.map((criterion) => criterion.id).join(", ");
  const modeGuidance = context?.evaluationMode
    ? `**طبيعة المهمة:** ركّز في التقييم على خصائص "${context.evaluationMode}"، مثل ${
        context.evaluationMode === "discussion"
          ? "قوة الحجة، احترام الرأي الآخر، وترتيب الأفكار المنطقي."
          : context.evaluationMode === "dialogue"
            ? "طبيعية الحوار، وضوح الأصوات، وتسلسل تبادل الكلام."
            : context.evaluationMode === "report"
              ? "الوضوح والموضوعية والتنظيم وفق هيكل التقرير."
              : "سلامة التعبير، الأسلوب، وتسلسل الأفكار."
      }`
    : "";

  return `
أنت معلم لغة عربية خبير في تقويم الكتابة المدرسية.
مهمتك هي تقييم نص الطالب تقييمًا موضوعيًا اعتمادًا على rubric التقييم المرفق فقط، ثم إرجاع النتيجة بصيغة JSON صالحة فقط.

لا تستخدم أي معيار غير موجود في rubric، ولا تمنح درجات عامة أو انطباعية. كل درجة يجب أن ترتبط مباشرة بمعيار محدد ومستوى أداء مناسب من المستويات الواردة فيه.

${context?.topicTitle ? `**عنوان الدرس:** ${context.topicTitle}` : ""}
${context?.evaluationTask ? `**مهمة التقييم الخاصة بالدرس:** ${context.evaluationTask}` : ""}
${modeGuidance}
${context?.studentName ? `**اسم الطالب:** ${context.studentName}` : ""}
${context?.studentGrade ? `**الصف الدراسي:** ${context.studentGrade}` : ""}
${context?.lessonContext ? `**مرجع الدرس المساند:**\n${context.lessonContext}` : ""}

**معايير التقييم (المجموع الكلي المحتمل: ${totalScore} نقطة):**
${criteriaList}

**تفاصيل المعايير ومستوياتها:**
${criteriaDetails}

**المفاتيح الإلزامية داخل rubric_breakdown:**
${criterionIds}

**تعليمات التقييم:**
1. اقرأ نص الطالب كاملًا قبل منح أي درجة.
2. قيّم كل معيار على حدة وبالاعتماد على rubric فقط.
3. اختر الدرجة الأقرب من الدرجات المعرفة داخل كل معيار، ولا تخترع درجة غير منطقية بالنسبة لمستويات ذلك المعيار.
4. اجعل feedback الخاص بكل معيار قصيرًا ودقيقًا، ويذكر سبب الدرجة بلغة معلم واضحة.
5. اجعل feedback العام متوازنًا: نقاط قوة أولًا، ثم جوانب التحسين.
6. إذا كان النص قصيرًا جدًا أو ناقصًا أو بعيدًا عن المهمة، فيجب أن ينعكس ذلك بوضوح في الدرجات والملاحظات.
7. لا تعتمد على معلومات غير موجودة في نص الطالب إلا بوصفها متطلبات واردة في rubric أو مرجع الدرس.

**تنسيق الإخراج المطلوب (JSON فقط):**
أرجع كائن JSON صالح يحتوي على الحقول التالية:
- \`score\`: رقم يمثل مجموع النقاط النهائية من ${totalScore}.
- \`feedback\`: ملاحظات عامة موجزة ومفيدة للطالب.
- \`suggestions\`: مصفوفة من الاقتراحات العملية المحددة لتحسين النص.
- \`rubric_breakdown\`: كائن يحتوي على جميع معرفات المعايير الإلزامية المذكورة أعلاه. قيمة كل معيار يجب أن تكون:
  - \`score\`: درجة هذا المعيار.
  - \`feedback\`: سبب موجز للدرجة مع الإشارة إلى مستوى الأداء الأقرب.

**قواعد صارمة:**
1. يجب أن تكون الاستجابة كلها JSON صالح فقط، دون أي نص قبلها أو بعدها.
2. يجب أن يحتوي \`rubric_breakdown\` على جميع المعايير، دون حذف أي معيار.
3. يجب أن يساوي الحقل \`score\` مجموع درجات جميع المعايير داخل \`rubric_breakdown\`.
4. لا تستخدم Markdown داخل JSON.
5. لا تضف حقولًا جديدة غير مطلوبة.
  `.trim();
};

const combineWritingValues = (
  writingValues: { [key: string]: string },
  sections?: WritingSection[]
): string => {
  return Object.entries(writingValues)
    .map(([key, value]) => {
      const sectionTitle = sections?.find((section) => section.id === key)?.title;
      const label = sectionTitle ? `${sectionTitle} (${key})` : key.toUpperCase();
      const normalizedValue = value.trim() ? value.trim() : "[Empty]";
      return `--- ${label} ---\n${normalizedValue}`;
    })
    .join("\n\n");
};

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
      const retryAfter = response.headers.get("retry-after");
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(Math.pow(2, attempt) * 2000, 30000);
      console.log(`Rate limited. Retry after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      lastError = new Error("Rate limit exceeded");
      continue;
    }

    return response;
  }

  throw lastError || new Error("Max retries exceeded");
}

export const getAIAnalysis = async (
  writingValues: { [key: string]: string },
  rubric: Rubric,
  context?: {
    topicTitle?: string;
    evaluationTask?: string;
    evaluationMode?: "writing" | "discussion" | "report" | "dialogue";
    writingSections?: WritingSection[];
    studentName?: string;
    studentGrade?: string;
    lessonContext?: string;
  }
): Promise<AIResponseType> => {
  const apiKey = import.meta.env.VITE_REVIEW_API_KEY;
  const API_URL = "https://openrouter.ai/api/v1/chat/completions";

  if (!apiKey) {
    console.error("Review API key is missing.");
    throw new Error("VITE_REVIEW_API_KEY is not configured in your .env file.");
  }

  const systemPrompt = buildSystemPrompt(rubric, context);
  const studentSubmission = combineWritingValues(writingValues, context?.writingSections);
  const userContent = `
قيّم النص التالي وفق rubric فقط.

نص الطالب:
${studentSubmission}
  `.trim();

  try {
    const response = await fetchWithRetry(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Arabic Writing Platform",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.4-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error:", errorData);
      throw new Error("Failed to connect to AI service");
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response from AI service");
    }

    const messageContent = data.choices[0].message.content;

    let content: AIResponseType;
    if (typeof messageContent === "string") {
      try {
        content = JSON.parse(messageContent);
      } catch (e) {
        console.error("Failed to parse AI response content:", e);
        throw new Error("The AI returned an invalid JSON response.");
      }
    } else if (typeof messageContent === "object" && messageContent !== null) {
      content = messageContent;
    } else {
      console.error("Unexpected AI response format:", messageContent);
      throw new Error("The AI returned an unexpected response format.");
    }

    return content;
  } catch (error) {
    console.error("Failed to get AI analysis:", error);
    throw new Error(
      "The AI evaluation process failed. Please check your connection or API key and try again."
    );
  }
};
