import { createChoiceDemo } from "./demoBuilders";
import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  { id: "pick", title: "اختيار عناصر العرض", caption: "ابدأ بالتعريف بالكتاب ثم المحتوى والرأي." },
  { id: "arrange", title: "تنظيم العرض", caption: "رتّب العناصر حتى يصبح العرض واضحًا ومقنعًا." },
  { id: "draft", title: "إنشاء العرض", caption: "اجمع العناصر في مسودة عرض واحدة." },
  { id: "submit", title: "المراجعة والإرسال", caption: "راجع العرض النهائي ثم أرسله." },
];

export const bookPresentationTutorial: TutorialConfig = {
  steps,
  demo: createChoiceDemo({
    cards: [
      { label: "كتاب", text: "بطاقة التعريف بالعنوان والكاتب.", selected: true },
      { label: "محتوى", text: "فكرة أو حدث يوضح مضمون الكتاب." },
      { label: "رأي", text: "لماذا تنصح به أو لا تنصح به." },
      { label: "خاتمة", text: "جملة تلخص الانطباع النهائي." },
    ],
    previewTitle: "عناصر العرض المختارة",
    previewText: "تعريف واضح ثم محتوى مختصر ثم رأي شخصي.",
    chips: ["تعريف", "محتوى", "رأي", "خاتمة"],
    submitLabel: "إرسال العرض",
  }),
};

