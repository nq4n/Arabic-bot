import { createChoiceDemo } from "./demoBuilders";
import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  { id: "pick", title: "اختيار الفكرة", caption: "ابدأ بالجملة التي تمثل الفكرة الرئيسة للفقرة." },
  { id: "arrange", title: "ربط الجمل", caption: "أضف الجمل الداعمة وأدوات الربط بترتيب منطقي." },
  { id: "draft", title: "إنشاء الفقرة", caption: "اجمع اختياراتك في مسودة فقرة واحدة." },
  { id: "submit", title: "المراجعة والإرسال", caption: "راجع ترابط الفقرة ثم أرسلها." },
];

export const paragraphWritingTutorial: TutorialConfig = {
  steps,
  demo: createChoiceDemo({
    cards: [
      { label: "الفكرة", text: "البحر عنصر أساسي في حياة أهل الخليج.", selected: true },
      { label: "تفصيل", text: "يساعد على الصيد والتجارة." },
      { label: "ربط", text: "لذلك ظل حاضرًا في الذاكرة الشعبية." },
      { label: "خاتمة", text: "وهكذا تتكون فقرة مترابطة." },
    ],
    previewTitle: "المسار المختار للفقرة",
    previewText: "فكرة رئيسة ثم جمل داعمة ثم رابط ثم جملة ختامية.",
    chips: ["فكرة", "تفصيل 1", "تفصيل 2", "رابط"],
    submitLabel: "إرسال الفقرة",
  }),
};

