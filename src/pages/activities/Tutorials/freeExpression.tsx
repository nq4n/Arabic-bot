import { renderSubmitDemo } from "./demoBuilders";
import type { TutorialConfig, TutorialStep } from "./types";

const steps: TutorialStep[] = [
  { id: "choose", title: "اختيار المحفز", caption: "اختر نوع المحفز المناسب لكتابة التعبير." },
  { id: "preview", title: "معاينة المحفز", caption: "اطّلع على التفاصيل أو الصورة قبل البدء." },
  { id: "write", title: "كتابة التعبير", caption: "اكتب تعبيرك بأسلوبك الخاص." },
  { id: "submit", title: "المراجعة والإرسال", caption: "راجع التعبير ثم أرسله للمعلم." },
];

function renderFreeExpressionDemo(stepId: string) {
  if (stepId === "choose") {
    return (
      <div className="tutorial-demo demo-free-pick" aria-label="اختيار محفز للتعبير الحر">
        <div className="demo-free-prompt selected" aria-hidden="true">
          <span className="demo-free-tag">صورة</span>
          <span className="demo-free-text">اكتب وصفًا حرًا للمشهد.</span>
        </div>
        <div className="demo-free-prompt" aria-hidden="true">
          <span className="demo-free-tag case">قضية</span>
          <span className="demo-free-text">عبّر عن رأيك مع الأدلة.</span>
        </div>
        <div className="demo-free-prompt" aria-hidden="true">
          <span className="demo-free-tag scenario">سيناريو</span>
          <span className="demo-free-text">اكتب ردك على الموقف.</span>
        </div>
        <div className="demo-free-prompt" aria-hidden="true">
          <span className="demo-free-tag free">موضوع حر</span>
          <span className="demo-free-text">اكتب عن فكرة تختارها.</span>
        </div>
      </div>
    );
  }

  if (stepId === "preview") {
    return (
      <div className="tutorial-demo demo-free-preview" aria-label="معاينة المحفز قبل الكتابة">
        <div className="demo-free-preview-card" aria-hidden="true">
          <div className="demo-free-preview-title">المحفز المختار</div>
          <div className="demo-free-preview-detail">مشهد ساحلي عند الغروب</div>
        </div>
        <div className="demo-free-preview-image" aria-hidden="true" />
      </div>
    );
  }

  if (stepId === "write") {
    return (
      <div className="tutorial-demo demo-free-write" aria-label="كتابة التعبير الحر">
        <div className="demo-edit-paper" aria-hidden="true">
          <div className="demo-line w-95" />
          <div className="demo-line w-85" />
          <div className="demo-line w-90 highlight" />
          <div className="demo-line w-70" />
          <div className="demo-line w-80" />
          <div className="demo-edit-cursor" />
        </div>
        <div className="demo-edit-note" aria-hidden="true">
          مساحة الكتابة للتعبير الحر.
        </div>
      </div>
    );
  }

  return renderSubmitDemo("إرسال التعبير", "إرسال التعبير الحر");
}

export const freeExpressionTutorial: TutorialConfig = {
  steps,
  demo: renderFreeExpressionDemo,
};

