import { createChoiceDemo } from "./demoBuilders";
import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  { id: "pick", title: "اختيار البداية", caption: "ابدأ بالمكان أو الشخصية أو الموقف الأول." },
  { id: "conflict", title: "بناء الحدث", caption: "اختر الحدث الذي يصنع المشكلة أو التوتر." },
  { id: "draft", title: "إنشاء القصة", caption: "اجمع المراحل في مسودة قصة مترابطة." },
  { id: "submit", title: "المراجعة والإرسال", caption: "راجع النهاية وتسلسل الأحداث ثم أرسل القصة." },
];

export const storytellingTutorial: TutorialConfig = {
  steps,
  demo: createChoiceDemo({
    cards: [
      { label: "بداية", text: "طفل وجد رسالة قديمة.", selected: true },
      { label: "حدث", text: "بدأ يبحث عن صاحبها." },
      { label: "عقدة", text: "ضاعت منه الرسالة في الطريق." },
      { label: "نهاية", text: "وجد صاحبها وعاد الأمل." },
    ],
    previewTitle: "مسار القصة المختار",
    previewText: "بداية تعرف بالشخصية ثم مشكلة ثم حل واضح في النهاية.",
    chips: ["بداية", "حدث", "عقدة", "نهاية"],
    submitLabel: "إرسال القصة",
  }),
};

