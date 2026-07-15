import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  { id: "start", title: "بدء الحوار", caption: "اضغط زر البدء للبحث عن زميل للحوار." },
  { id: "wait", title: "انتظار المطابقة", caption: "انتظر حتى يتم اختيار شريك للحوار." },
  { id: "chat", title: "التبادل والحوار", caption: "تبادل الرسائل والأفكار مع زميلك وفق السيناريو." },
  { id: "finish", title: "إنهاء النشاط", caption: "بعد اكتمال الحوار ستظهر رسالة الإنهاء." },
];

function renderDialogueDemo(stepId: string) {
  if (stepId === "start") {
    return (
      <div className="tutorial-demo demo-dialogue-start" aria-label="بدء الحوار">
        <div className="demo-dialogue-card" aria-hidden="true">
          <span className="demo-dialogue-tag">سيناريو الحوار</span>
          <span className="demo-dialogue-text">ناقش مع زميلك فكرة من النص وقدّم رأيك بدليل.</span>
        </div>
        <button type="button" className="button demo-dialogue-button" tabIndex={-1} aria-hidden="true">
          ابدأ الحوار
        </button>
      </div>
    );
  }

  if (stepId === "wait") {
    return (
      <div className="tutorial-demo demo-dialogue-wait" aria-label="انتظار المطابقة">
        <div className="demo-dialogue-wait-card" aria-hidden="true">
          <div className="demo-dialogue-wait-title">جاري البحث عن شريك...</div>
          <div className="demo-dialogue-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (stepId === "chat") {
    return (
      <div className="tutorial-demo demo-dialogue-chat" aria-label="حوار ثنائي بين طالبين">
        <div className="demo-dialogue-chat-window" aria-hidden="true">
          <div className="demo-dialogue-role-row">
            <span className="demo-dialogue-role me">أنا</span>
            <span className="demo-dialogue-role peer">زميلي</span>
          </div>
          <div className="demo-dialogue-row peer delay-1">
            <span className="demo-dialogue-bubble peer">أرى أن الفكرة الرئيسية واضحة في البداية.</span>
          </div>
          <div className="demo-dialogue-row me delay-2">
            <span className="demo-dialogue-bubble me">أتفق، وسأضيف مثالًا لدعمها.</span>
          </div>
          <div className="demo-dialogue-row peer delay-3">
            <span className="demo-dialogue-bubble peer">ممتاز، ما المثال الذي ستذكره؟</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorial-demo demo-dialogue-done" aria-label="إكمال نشاط الحوار">
      <div className="demo-dialogue-done-card" aria-hidden="true">
        <div className="demo-dialogue-done-title">أحسنت! أنهيت نشاط الحوار.</div>
        <button type="button" className="button demo-dialogue-done-button" tabIndex={-1}>
          العودة إلى الدرس
        </button>
      </div>
    </div>
  );
}

export const dialogueTextTutorial: TutorialConfig = {
  steps,
  demo: renderDialogueDemo,
};

