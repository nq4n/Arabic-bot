import { createChoiceDemo } from "./demoBuilders";
import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  { id: "read", title: "قراءة النص", caption: "اقرأ النص وحدد فكرته الأساسية أولًا." },
  { id: "pick", title: "اختيار التلخيص", caption: "اختر الملخص الذي يحافظ على المعنى ويحذف الزائد." },
  { id: "draft", title: "إنشاء الملخص", caption: "اجمع اختياراتك في مسودة تلخيص واحدة." },
  { id: "submit", title: "المراجعة والإرسال", caption: "أعد صياغة التلخيص بأسلوبك ثم أرسله." },
];

export const summarizationTutorial: TutorialConfig = {
  steps,
  demo: createChoiceDemo({
    cards: [
      { label: "نص", text: "اقرأ الفقرة وحدد معناها العام.", selected: true },
      { label: "ملخص", text: "اختر الصياغة الأقصر والأدق." },
      { label: "مراجعة", text: "احذف كل تفصيل لا يخدم الفكرة." },
      { label: "صياغة", text: "اكتب الملخص بأسلوبك." },
    ],
    previewTitle: "أفضل تلخيص مختار",
    previewText: "تلخيص يحافظ على المعنى ويختصر التفاصيل الثانوية.",
    chips: ["فكرة أساسية", "ملخص 1", "ملخص 2", "صياغة نهائية"],
    submitLabel: "إرسال التلخيص",
  }),
};

