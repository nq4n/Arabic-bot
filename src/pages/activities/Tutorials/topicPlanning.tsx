import { createAssembleDemo } from "./demoBuilders";
import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  { id: "order", title: "ترتيب عناصر الموضوع", caption: "رتّب العنوان والمقدمة والأفكار والخاتمة." },
  { id: "draft", title: "إنشاء التصميم", caption: "حوّل البطاقات المرتبة إلى تصميم أولي واضح." },
  { id: "edit", title: "تحسين التصميم", caption: "أضف الشواهد وعدّل الصياغة قبل الإرسال." },
  { id: "submit", title: "المراجعة والإرسال", caption: "راجع التصميم النهائي ثم أرسله." },
];

export const topicPlanningTutorial: TutorialConfig = {
  steps,
  demo: createAssembleDemo({
    partLabel: "بطاقة",
    parts: ["عنوان ومقدمة", "فكرة رئيسة مع شاهد", "خاتمة أو توصية"],
    chips: ["عنوان", "مقدمة", "شاهد", "خاتمة"],
    note: "أضف الشاهد أو المثال الأنسب قبل الإرسال.",
    submitLabel: "إرسال التصميم",
  }),
};

