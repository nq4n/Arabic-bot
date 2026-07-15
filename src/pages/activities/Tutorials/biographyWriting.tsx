import { createAssembleDemo } from "./demoBuilders";
import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  { id: "order", title: "ترتيب المعلومات", caption: "ابدأ بالتعريف ثم المنهج والإنجاز والأثر." },
  { id: "draft", title: "إنشاء الترجمة", caption: "حوّل البطاقات إلى ترجمة موجزة ومنظمة." },
  { id: "edit", title: "تحسين الصياغة", caption: "راجع التسلسل وأضف لمستك قبل الإرسال." },
  { id: "submit", title: "المراجعة والإرسال", caption: "راجع الترجمة النهائية ثم أرسلها." },
];

export const biographyWritingTutorial: TutorialConfig = {
  steps,
  demo: createAssembleDemo({
    partLabel: "بطاقة",
    parts: ["تعريف بالشخصية", "أبرز الإنجازات", "الأثر في المجتمع"],
    chips: ["تعريف", "منهج", "إنجاز", "أثر"],
    note: "راجع التسلسل الزمني أو المنطقي قبل الإرسال.",
    submitLabel: "إرسال الترجمة",
  }),
};

