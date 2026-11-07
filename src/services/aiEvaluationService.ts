import type { WritingSection } from "../data/topics";
import type { Rubric, RubricCriterion, RubricLevel } from "../data/rubrics";
import { supabase } from "../supabaseClient";

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

export const AI_ERROR_TYPES = ["إملائي", "نحوي", "ترقيم", "أسلوبي"] as const;
export type AIErrorType = (typeof AI_ERROR_TYPES)[number];

// موضع خطأ في نص الطالب — تحديد فقط دون تصحيح، منسوب إلى معيار التقييم الذي يخصّه.
// note: وصف موجز لطبيعة الخطأ دون ذكر الصيغة الصحيحة.
export type AIErrorItem = {
  criterion_id: string;
  quote: string;
  type: AIErrorType;
  note?: string;
};

const MIN_MEANINGFUL_WORDS_FOR_GRADE = 5;
const SHORT_SUBMISSION_WORD_LIMIT = 15;
const SHORT_SUBMISSION_MAX_RATIO = 0.25;

const getMeaningfulWords = (writingValues: { [key: string]: string }): string[] => {
  const text = Object.values(writingValues).join(" ").trim();
  return text.match(/[\p{L}\p{N}]+/gu) ?? [];
};

const hasLetterContent = (writingValues: { [key: string]: string }): boolean => {
  return /\p{L}/u.test(Object.values(writingValues).join(" "));
};

const getCriterionMaxScore = (criterion: RubricCriterion): number => {
  return criterion.levels.find((level) => level.id === "excellent")?.score ?? 0;
};

const getRubricTotalScore = (rubric: Rubric): number => {
  return rubric.criteria.reduce((sum, criterion) => sum + getCriterionMaxScore(criterion), 0);
};

const buildZeroEvaluation = (rubric: Rubric, reason: string): AIResponseType => ({
  score: 0,
  feedback: reason,
  suggestions: [
    "اكتب نصًا كاملًا مرتبطًا بالمهمة قبل طلب التقييم.",
    "راجع عناصر الدرس والمعايير ثم عالج كل جزء مطلوب بوضوح.",
  ],
  rubric_breakdown: rubric.criteria.reduce<AIResponseType["rubric_breakdown"]>(
    (breakdown, criterion) => ({
      ...breakdown,
      [criterion.id]: {
        score: 0,
        feedback: reason,
      },
    }),
    {}
  ),
});

const getNearestAllowedScore = (score: unknown, criterion: RubricCriterion): number => {
  const numericScore = typeof score === "number" && Number.isFinite(score) ? score : 0;
  const allowedScores = Array.from(new Set(criterion.levels.map((level) => level.score))).sort(
    (a, b) => a - b
  );

  if (allowedScores.length === 0) return 0;

  return allowedScores.reduce((nearest, current) => {
    const currentDistance = Math.abs(current - numericScore);
    const nearestDistance = Math.abs(nearest - numericScore);
    if (currentDistance === nearestDistance) {
      return Math.min(current, nearest);
    }
    return currentDistance < nearestDistance ? current : nearest;
  }, allowedScores[0]);
};

const normalizeAIResponse = (response: AIResponseType, rubric: Rubric): AIResponseType => {
  const rubricBreakdown = rubric.criteria.reduce<AIResponseType["rubric_breakdown"]>(
    (breakdown, criterion) => {
      const item = response.rubric_breakdown?.[criterion.id];
      const score = getNearestAllowedScore(item?.score, criterion);

      return {
        ...breakdown,
        [criterion.id]: {
          score,
          feedback:
            typeof item?.feedback === "string" && item.feedback.trim()
              ? item.feedback.trim()
              : "لم يظهر هذا المعيار بوضوح في النص.",
        },
      };
    },
    {}
  );

  const score = Object.values(rubricBreakdown).reduce((sum, item) => sum + item.score, 0);
  const suggestions = Array.isArray(response.suggestions)
    ? response.suggestions.filter((suggestion): suggestion is string => typeof suggestion === "string")
    : [];

  return {
    score,
    feedback:
      typeof response.feedback === "string" && response.feedback.trim()
        ? response.feedback.trim()
        : "تم تقييم النص وفق المعايير المعلنة.",
    suggestions,
    rubric_breakdown: rubricBreakdown,
  };
};

const reduceScoreToCap = (
  response: AIResponseType,
  rubric: Rubric,
  maxAllowedScore: number
): AIResponseType => {
  if (response.score <= maxAllowedScore) {
    return response;
  }

  const rubricBreakdown = { ...response.rubric_breakdown };
  let currentTotal = response.score;
  let changed = true;

  while (currentTotal > maxAllowedScore && changed) {
    changed = false;

    for (const criterion of rubric.criteria) {
      if (currentTotal <= maxAllowedScore) break;

      const item = rubricBreakdown[criterion.id];
      if (!item || item.score <= 0) continue;

      const lowerScore = Array.from(new Set(criterion.levels.map((level) => level.score)))
        .filter((score) => score < item.score)
        .sort((a, b) => b - a)[0];

      if (lowerScore === undefined) continue;

      currentTotal -= item.score - lowerScore;
      rubricBreakdown[criterion.id] = {
        ...item,
        score: lowerScore,
        feedback: `${item.feedback} النص قصير جدًا؛ لذلك لا يستحق درجة مرتفعة في هذا المعيار.`,
      };
      changed = true;
    }
  }

  return {
    ...response,
    score: currentTotal,
    feedback: `${response.feedback} النص قصير جدًا، لذلك حُدّدت الدرجة بما يناسب حجم الإجابة.`,
    rubric_breakdown: rubricBreakdown,
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
  const realisticTeacherGuidance = `
**سياسة التقييم الواقعي:**
- قيّم كمعلم لغة عربية خبير وصارم وعادل، لا كأداة تشجيع عامة.
- امنح الدرجة بناءً على الدليل الموجود في نص الطالب فقط؛ لا تكافئ النية أو الجهد غير الظاهر في النص.
- لا ترفع الدرجة مجاملةً. إذا كان الأداء ضعيفًا أو ناقصًا فاختر المستوى الضعيف أو درجة الصفر حسب rubric.
- إذا كان النص فارغًا، أو شبه فارغ، أو غير عربي، أو عبارات عشوائية، أو منسوخًا من التعليمات، أو بعيدًا عن مهمة الدرس، فيجب أن تكون الدرجة النهائية 0 وأن تكون درجة كل معيار 0.
- إذا كان النص قصيرًا جدًا ولا يقدّم أفكارًا كافية، فلا يجوز منحه درجة مرتفعة حتى لو كانت لغته سليمة.
- إذا أجاب الطالب عن موضوع مختلف عن المطلوب، قيّم ارتباطه بالمهمة بصفر، ولا تمنحه درجات في المعايير التي لا تظهر في النص.
- أخطاء الحقائق، غياب العناصر المطلوبة، ضعف التنظيم، وكثرة الأخطاء اللغوية يجب أن تخفض الدرجة بوضوح.
  `.trim();

  return `
أنت معلم لغة عربية خبير في تقويم الكتابة المدرسية.
مهمتك هي تقييم نص الطالب تقييمًا موضوعيًا اعتمادًا على rubric التقييم المرفق فقط، ثم إرجاع النتيجة بصيغة JSON صالحة فقط.

لا تستخدم أي معيار غير موجود في rubric، ولا تمنح درجات عامة أو انطباعية. كل درجة يجب أن ترتبط مباشرة بمعيار محدد ومستوى أداء مناسب من المستويات الواردة فيه.

${context?.topicTitle ? `**عنوان الدرس:** ${context.topicTitle}` : ""}
${context?.evaluationTask ? `**مهمة التقييم الخاصة بالدرس:** ${context.evaluationTask}` : ""}
${modeGuidance}
${realisticTeacherGuidance}
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

// Models occasionally wrap JSON in ```json ... ``` fences or add stray prose
// despite being told not to. Strip fences and fall back to the first {...}
// block so a well-formed answer isn't rejected as "invalid JSON".
const parseLooseJSON = (raw: string): unknown => {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      return JSON.parse(withoutFence);
    } catch {
      const start = withoutFence.indexOf("{");
      const end = withoutFence.lastIndexOf("}");
      if (start !== -1 && end > start) {
        return JSON.parse(withoutFence.slice(start, end + 1));
      }
      throw new Error("No valid JSON found in AI response.");
    }
  }
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
  const meaningfulWords = getMeaningfulWords(writingValues);

  if (!hasLetterContent(writingValues) || meaningfulWords.length < MIN_MEANINGFUL_WORDS_FOR_GRADE) {
    return buildZeroEvaluation(
      rubric,
      "النص غير كافٍ للتقييم الواقعي؛ لذلك يستحق صفرًا في جميع المعايير."
    );
  }

  const systemPrompt = buildSystemPrompt(rubric, context);
  const studentSubmission = combineWritingValues(writingValues, context?.writingSections);
  const userContent = `
قيّم النص التالي وفق rubric فقط.
عدد الكلمات ذات المعنى في النص: ${meaningfulWords.length}.
إذا كان النص غير كافٍ أو خارج المهمة، امنحه صفرًا عند الحاجة دون مجاملة.

نص الطالب:
${studentSubmission}
  `.trim();

  try {
    // Grading goes through the `ai-evaluate` edge function (key stays server-side).
    const { data, error: fnError } = await supabase.functions.invoke("ai-evaluate", {
      body: { systemPrompt, userContent, temperature: 0.2 },
    });

    if (fnError || !data?.success || data?.content == null) {
      console.error("AI evaluate error:", fnError || data?.error, data?.detail ?? "");
      throw new Error("Failed to connect to AI service");
    }

    const messageContent = data.content;

    let content: AIResponseType;
    if (typeof messageContent === "string") {
      try {
        content = parseLooseJSON(messageContent) as AIResponseType;
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

    const normalizedContent = normalizeAIResponse(content, rubric);

    if (meaningfulWords.length < SHORT_SUBMISSION_WORD_LIMIT) {
      return reduceScoreToCap(
        normalizedContent,
        rubric,
        getRubricTotalScore(rubric) * SHORT_SUBMISSION_MAX_RATIO
      );
    }

    return normalizedContent;
  } catch (error) {
    console.error("Failed to get AI analysis:", error);
    throw new Error(
      "The AI evaluation process failed. Please check your connection or API key and try again."
    );
  }
};

// -----------------------------------------------------------------------------
// تحديد مواضع الأخطاء (دون تصحيح)
// -----------------------------------------------------------------------------

const buildErrorLocationPrompt = (rubric: Rubric): string => {
  const criteriaDetails = rubric.criteria
    .map((criterion) => `- ${criterion.name} (ID: ${criterion.id}): ${criterion.description}`)
    .join("\n");
  const criterionIds = rubric.criteria.map((criterion) => criterion.id).join("، ");

  return `
أنت معلم لغة عربية خبير. مهمتك الوحيدة: تحديد مواضع الأخطاء في نص الطالب، دون تصحيحها ودون إعادة كتابتها، ونسب كل خطأ إلى معيار التقييم الذي يخصّه.

قواعد صارمة:
- لا تقترح تصحيحًا، ولا تكتب الصيغة الصحيحة، ولا تطلب من الطالب أن يكتب كذا. فقط حدّد مكان الخطأ ونوعه ووصفه والمعيار الذي يخصّه.
- لكل خطأ، انسخ المقطع الخاطئ حرفيًا كما ورد في نص الطالب تمامًا (نفس الحروف والتشكيل إن وُجد)، دون أي تعديل.
- اجعل المقطع المنسوخ قصيرًا بقدر الإمكان (كلمة أو عبارة قصيرة) بحيث يكفي للعثور على موضع الخطأ.
- نوع الخطأ يجب أن يكون واحدًا من: إملائي، نحوي، ترقيم، أسلوبي.
- أضف وصفًا موجزًا (note) يشرح **طبيعة** الخطأ دون كشف الصيغة الصحيحة، مثل: "همزة قطع في موضع همزة وصل"، "تذكير الصفة مع موصوف مؤنث"، "غياب فاصلة بين جملتين". لا تكتب الكلمة الصحيحة إطلاقًا.
- انسب كل خطأ إلى المعيار الأنسب له من معايير التقييم أدناه عبر معرّفه (criterion_id).
- كن دقيقًا وشاملًا: حدّد كل خطأ فعلي على حدة، ولا تُجمِل. لكن لا تُكرّر الخطأ نفسه ولا تخترع أخطاء غير موجودة. إن كان النص سليمًا فأعِد قائمة فارغة.

معايير التقييم (انسب كل خطأ إلى أحدها):
${criteriaDetails}

المعرّفات المسموحة لـ criterion_id: ${criterionIds}

تنسيق الإخراج المطلوب (JSON صالح فقط، دون أي نص قبله أو بعده):
{
  "errors": [
    { "criterion_id": "<أحد المعرّفات أعلاه>", "quote": "<المقطع الخاطئ منقول حرفيًا>", "type": "<إملائي|نحوي|ترقيم|أسلوبي>", "note": "<وصف موجز لطبيعة الخطأ دون الصيغة الصحيحة>" }
  ]
}
`.trim();
};

const normalizeErrorItems = (raw: unknown, criterionIds: string[]): AIErrorItem[] => {
  const list = Array.isArray((raw as { errors?: unknown })?.errors)
    ? (raw as { errors: unknown[] }).errors
    : Array.isArray(raw)
      ? (raw as unknown[])
      : [];

  const fallbackCriterion = criterionIds[0] ?? "";
  const seen = new Set<string>();
  const items: AIErrorItem[] = [];

  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as { criterion_id?: unknown; quote?: unknown; type?: unknown; note?: unknown };

    const quote = typeof e.quote === "string" ? e.quote.trim() : "";
    if (!quote) continue;

    const criterionId =
      typeof e.criterion_id === "string" && criterionIds.includes(e.criterion_id)
        ? e.criterion_id
        : fallbackCriterion;

    const type: AIErrorType =
      typeof e.type === "string" && (AI_ERROR_TYPES as readonly string[]).includes(e.type.trim())
        ? (e.type.trim() as AIErrorType)
        : "أسلوبي";

    const note = typeof e.note === "string" && e.note.trim() ? e.note.trim() : undefined;

    const dedupeKey = `${criterionId}::${quote}::${type}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    items.push({ criterion_id: criterionId, quote, type, note });
  }

  return items;
};

// يحدّد مواضع الأخطاء في كتابة الطالب دون تصحيحها، وينسب كل خطأ إلى معيار
// التقييم الذي يخصّه. مستقل تمامًا عن الدرجة، فيمكن استدعاؤه بالتوازي مع
// التقييم أو لتعبئة التسليمات القديمة.
export const getAIErrorLocations = async (
  writingValues: { [key: string]: string },
  rubric: Rubric,
  context?: { writingSections?: WritingSection[] }
): Promise<AIErrorItem[]> => {
  const entries = Object.entries(writingValues).filter(([, value]) => value && value.trim());
  if (entries.length === 0) return [];
  if (!hasLetterContent(writingValues)) return [];
  if (!rubric?.criteria?.length) return [];

  const criterionIds = rubric.criteria.map((criterion) => criterion.id);
  const systemPrompt = buildErrorLocationPrompt(rubric);

  const studentSubmission = entries
    .map(([key, value]) => {
      const title = context?.writingSections?.find((section) => section.id === key)?.title;
      const label = title ? `${title} (${key})` : key;
      return `--- ${label} ---\n${value.trim()}`;
    })
    .join("\n\n");

  const userContent = `
حدّد مواضع الأخطاء في النص التالي فقط، دون تصحيح، وانسب كل خطأ إلى المعيار الأنسب.

نص الطالب:
${studentSubmission}
  `.trim();

  try {
    const { data, error: fnError } = await supabase.functions.invoke("ai-evaluate", {
      body: { systemPrompt, userContent, temperature: 0.1 },
    });

    if (fnError || !data?.success || data?.content == null) {
      console.error("AI error-location error:", fnError || data?.error, data?.detail ?? "");
      return [];
    }

    let parsed: unknown = data.content;
    if (typeof parsed === "string") {
      try {
        parsed = parseLooseJSON(parsed);
      } catch (e) {
        console.error("Failed to parse AI error-location response:", e);
        return [];
      }
    }

    return normalizeErrorItems(parsed, criterionIds);
  } catch (error) {
    console.error("Failed to get AI error locations:", error);
    return [];
  }
};
