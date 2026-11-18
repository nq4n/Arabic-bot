// تصنيف أحداث تغيّر المصادقة القادمة من Supabase.
//
// يُطلق عميل Supabase الحدث onAuthStateChange ليس فقط عند تسجيل الدخول أو
// الخروج، بل أيضاً عند تحديث الرمز (token refresh) تلقائياً كل فترة، وعند
// العودة إلى التبويب، وعند مزامنة الجلسة بين تبويبات المتصفح. هذه الأحداث
// الأخيرة لنفس المستخدم يجب ألا تُعيد تحميل التطبيق خلف شاشة التحميل، لأن
// ذلك يفكّ تركيب الصفحة الحالية ويُلغي أي عملية جارية (مثل تقييم الذكاء
// الاصطناعي). هذه الدالة النقيّة تميّز بين الحالات.

export type AuthChangeKind =
  | "background-refresh" // نفس المستخدم: تحديث رمز/تبويب — لا تُعِد تحميل الواجهة
  | "signed-out" // خرج المستخدم
  | "user-changed"; // دخل مستخدم (أو تغيّر المستخدم)

export const classifyAuthChange = (
  prevUserId: string | null,
  nextUserId: string | null
): AuthChangeKind => {
  if (!nextUserId) return "signed-out";
  if (nextUserId === prevUserId) return "background-refresh";
  return "user-changed";
};
