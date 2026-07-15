import { createAssembleDemo } from "./demoBuilders";
import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  {
    id: "order",
    title: "ترتيب أجزاء التقرير",
    caption: "حرّك الأجزاء للأعلى أو الأسفل حتى يصبح التقرير متسلسلًا.",
  },
  {
    id: "draft",
    title: "إنشاء المسودة",
    caption: "اضغط \"إنشاء مسودة\" لتجميع الأجزاء في نص واحد.",
  },
  { id: "edit", title: "تحرير التقرير", caption: "عدّل المسودة وأضف التفاصيل التي تحتاجها." },
  { id: "submit", title: "المراجعة والإرسال", caption: "راجع التقرير ثم أرسله للمعلم." },
];

export const reportWritingTutorial: TutorialConfig = {
  steps,
  demo: createAssembleDemo({
    partLabel: "الجزء",
    parts: ["مقدمة مختصرة عن الموضوع", "تفاصيل أساسية بالترتيب", "خاتمة موجزة وواضحة"],
    chips: ["جزء 1", "جزء 2", "جزء 3", "جزء 4"],
    note: "يمكنك تعديل النص قبل الإرسال.",
    submitLabel: "إرسال التقرير",
  }),
};

