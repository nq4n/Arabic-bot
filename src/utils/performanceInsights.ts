// src/utils/performanceInsights.ts
//
// محلّل أداء بسيط للطالب — قائم على قواعد ثابتة فقط، بدون أي ذكاء اصطناعي.
// يأخذ أرقام تقدّم الطالب (دروس/أنشطة/تقييمات/تسليمات/نقاط) ويُخرج ملخصًا
// نصيًّا مبسّطًا: المستوى العام، نقاط القوة، ما يُنصح بتحسينه، والخطوة التالية.

export type PerformanceInput = {
  totalTopics: number;
  completedLessons: number;
  activitiesDone: number;
  evaluationsDone: number;
  submissionsCount: number;
  ratingsCount: number;
  totalPoints: number;
};

export type PerformanceLevelTone = "start" | "ok" | "good" | "excellent";

export type PerformanceInsight = {
  level: string;
  levelTone: PerformanceLevelTone;
  completionPercent: number;
  headline: string;
  strengths: string[];
  improvements: string[];
  nextStep: string;
};

/**
 * تحليل أداء الطالب بقواعد بسيطة (بدون ذكاء اصطناعي).
 */
export function analyzePerformance(input: PerformanceInput): PerformanceInsight {
  const {
    totalTopics,
    completedLessons,
    activitiesDone,
    evaluationsDone,
    submissionsCount,
    ratingsCount,
    totalPoints,
  } = input;

  const denominator = Math.max(totalTopics, 1);
  const completionPercent = Math.min(
    100,
    Math.round((completedLessons / denominator) * 100)
  );

  let level: string;
  let levelTone: PerformanceLevelTone;
  if (completionPercent >= 80) {
    level = "متميّز";
    levelTone = "excellent";
  } else if (completionPercent >= 50) {
    level = "جيد جدًا";
    levelTone = "good";
  } else if (completionPercent >= 20) {
    level = "في تقدّم";
    levelTone = "ok";
  } else {
    level = "بداية الطريق";
    levelTone = "start";
  }

  const strengths: string[] = [];
  const improvements: string[] = [];

  // نقاط القوة
  if (completedLessons > 0) {
    strengths.push(`أكملت ${completedLessons} من ${totalTopics} درسًا.`);
  }
  if (activitiesDone >= 3) {
    strengths.push("مواظب على الأنشطة التطبيقية داخل الدروس.");
  }
  if (submissionsCount > 0) {
    strengths.push(`أرسلت ${submissionsCount} مهمة كتابية للتقييم.`);
  }
  if (ratingsCount > 0) {
    strengths.push(`حصلت على ${ratingsCount} تقييمًا من معلمك.`);
  }

  // ما يُنصح بتحسينه
  if (completedLessons === 0) {
    improvements.push("ابدأ بإكمال درس واحد كاملًا لتجمع أول نقاطك.");
  }
  if (activitiesDone === 0) {
    improvements.push("جرّب الأنشطة التطبيقية داخل الدروس لترسيخ المهارة.");
  } else if (completedLessons > 0 && activitiesDone < completedLessons) {
    improvements.push("أكمل الأنشطة التطبيقية لبقية الدروس التي درستها.");
  }
  if (evaluationsDone === 0 && completedLessons > 0) {
    improvements.push("أنجز مهمة التقييم في الدروس لتقيس مستواك بدقة.");
  }
  if (submissionsCount > 0 && ratingsCount === 0) {
    improvements.push("تابع مع معلمك للحصول على تقييم لتسليماتك.");
  }

  // ضمان ألا تكون القوائم فارغة
  if (strengths.length === 0) {
    strengths.push("أنت في بداية رحلتك، وكل خطوة تُحتسب لك.");
  }
  if (improvements.length === 0) {
    improvements.push("حافظ على وتيرتك الحالية، وراجع الدروس السابقة من حين لآخر.");
  }

  // الخطوة التالية
  let nextStep: string;
  if (completedLessons === 0) {
    nextStep = "اختر الدرس الأول، واقرأ خطواته، ثم ابدأ نشاطه.";
  } else if (completedLessons < totalTopics) {
    nextStep = "انتقل إلى الدرس التالي وأكمل خطواته ونشاطه التفاعلي.";
  } else {
    nextStep = "أكملت كل الدروس! ركّز الآن على تحسين كتاباتك وفق ملاحظات معلمك.";
  }

  // الجملة الموجزة
  const headline =
    completedLessons === 0
      ? `رصيدك ${totalPoints} نقطة. ابدأ أول درس لتنطلق رحلتك.`
      : `مستواك العام: ${level} — أكملت ${completionPercent}% من الدروس برصيد ${totalPoints} نقطة.`;

  return {
    level,
    levelTone,
    completionPercent,
    headline,
    strengths,
    improvements,
    nextStep,
  };
}
