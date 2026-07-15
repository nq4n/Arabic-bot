import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  { id: "case", title: "اختيار القضية", caption: "اختر قضية للانضمام مع زملائك في النقاش." },
  { id: "start", title: "بدء المناقشة", caption: "بعد الاختيار اضغط زر البدء للدخول للمجموعة." },
  { id: "chat", title: "المشاركة بالأفكار", caption: "شارك رأيك واحترم آراء الآخرين مع توضيح الأدلة." },
  { id: "finish", title: "إنهاء النشاط", caption: "عند الانتهاء ستظهر رسالة إكمال النشاط." },
];

function renderDiscussionDemo(stepId: string) {
  if (stepId === "case") {
    return (
      <div className="tutorial-demo demo-collab-pick" aria-label="اختيار قضية للنقاش">
        <div className="demo-collab-header" aria-hidden="true">
          <span className="demo-collab-title">اختر قضية للنقاش</span>
          <span className="demo-collab-subtitle">اختر قضية تناسبك وابدأ المشاركة.</span>
        </div>
        <div className="demo-collab-list" aria-hidden="true">
          <div className="demo-collab-item selected">
            <span>كيف نحافظ على بيئتنا؟</span>
            <span className="demo-collab-count">2/6</span>
          </div>
          <div className="demo-collab-item">
            <span>تأثير التقنية على الدراسة</span>
            <span className="demo-collab-count">4/6</span>
          </div>
          <div className="demo-collab-item is-full">
            <span>أهمية العمل التطوعي</span>
            <span className="demo-collab-count">6/6</span>
          </div>
        </div>
      </div>
    );
  }

  if (stepId === "start") {
    return (
      <div className="tutorial-demo demo-collab-start" aria-label="بدء المناقشة الجماعية">
        <div className="demo-collab-selected" aria-hidden="true">
          <span className="demo-collab-tag">القضية المختارة</span>
          <span className="demo-collab-selected-title">كيف نحافظ على بيئتنا؟</span>
          <span className="demo-collab-count">3/6 مشاركين</span>
        </div>
        <button type="button" className="button demo-collab-start-button" tabIndex={-1} aria-hidden="true">
          ابدأ المناقشة
        </button>
      </div>
    );
  }

  if (stepId === "chat") {
    return (
      <div className="tutorial-demo demo-collab-chat" aria-label="محادثة جماعية حول القضية">
        <div className="demo-chat-window" aria-hidden="true">
          <div className="demo-chat-row peer delay-1">
            <span className="demo-chat-bubble peer">أقترح حلولًا عملية لتقليل النفايات.</span>
          </div>
          <div className="demo-chat-row me delay-2">
            <span className="demo-chat-bubble me">أوافقك، ويمكننا دعم ذلك بأمثلة من المدرسة.</span>
          </div>
          <div className="demo-chat-row peer delay-3">
            <span className="demo-chat-bubble peer">هل لديكم أمثلة من المجتمع المحلي؟</span>
          </div>
          <div className="demo-chat-typing">... جاري كتابة رد</div>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorial-demo demo-collab-done" aria-label="إكمال نشاط المناقشة">
      <div className="demo-collab-done-card" aria-hidden="true">
        <div className="demo-collab-done-title">أحسنت! أنهيت نشاط المناقشة.</div>
        <button type="button" className="button demo-collab-done-button" tabIndex={-1}>
          العودة إلى الدرس
        </button>
      </div>
    </div>
  );
}

export const discussingIssueTutorial: TutorialConfig = {
  steps,
  demo: renderDiscussionDemo,
};

