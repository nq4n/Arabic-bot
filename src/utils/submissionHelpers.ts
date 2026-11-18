// منطق نقيّ (بدون React) لإدارة التسليمات المتعددة لكل درس.
// مُستخرَج من صفحة التقييم ليكون قابلاً للاختبار بشكل مستقل.

/** العنوان الافتراضي للتسليم رقم n. */
export const defaultSubmissionTitle = (n: number): string => `التسليم رقم ${n}`;

/** الحد الأقصى لمحاولات التقييم داخل التسليم الواحد (كتابة أولى + تعديل واحد). */
export const MAX_ATTEMPTS_PER_SUBMISSION = 2;

export interface TopicSubmissionLike {
  id: number;
  /** درجة الذكاء الاصطناعي؛ null تعني مسودة لم تُقيَّم بعد. */
  ai_grade: number | null;
}

/**
 * هل يُمنح الطالب نقاطاً عند هذا التقييم؟
 * النقاط تُمنح مرة واحدة فقط لكل درس (لأول تسليم مُقيَّم فيه). التعديل
 * (مراجعة) لا يمنح نقاطاً، والتسليمات الإضافية لدرسٍ سبق أن حصل على درجة
 * تُحفظ وتُقيَّم دون نقاط جديدة — حتى لا يُكرِّر الطالب التسليم لجمع النقاط.
 */
export const grantsPointsForEvaluation = (
  isRevision: boolean,
  topicSubmissions: TopicSubmissionLike[],
  currentSubmissionId: number | null
): boolean => {
  if (isRevision) return false;
  const topicAlreadyHasGrade = topicSubmissions.some(
    (s) => s.ai_grade != null && s.id !== currentSubmissionId
  );
  return !topicAlreadyHasGrade;
};

/**
 * العنوان الذي يُحفَظ للتسليم: ما كتبه الطالب إن وُجد، وإلا العنوان
 * الافتراضي «التسليم رقم fallbackNumber».
 */
export const resolveSubmissionTitle = (
  rawTitle: string,
  fallbackNumber: number
): string => rawTitle.trim() || defaultSubmissionTitle(fallbackNumber);

/** هل بلغ هذا التسليم حدّ المحاولات (نسخة سابقة واحدة محفوظة على الأقل)؟ */
export const hasReachedAttemptLimit = (revisionsCount: number): boolean =>
  revisionsCount >= MAX_ATTEMPTS_PER_SUBMISSION - 1;
