import { renderSubmitDemo } from "./demoBuilders";
import type { TutorialConfig, TutorialStep } from "./types";

const SAMPLE_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80";

const steps: TutorialStep[] = [
  { id: "pick", title: "اختيار الوصف", caption: "اسحب بطاقة الوصف وأسقطها فوق الصورة." },
  { id: "complete", title: "إكمال المشاهد", caption: "كرّر الاختيار لكل صورة حتى يكتمل شريط التقدم." },
  { id: "draft", title: "إنشاء المسودة", caption: "اجمع اختياراتك تلقائيًا في مسودة واحدة." },
  { id: "submit", title: "المراجعة والإرسال", caption: "عدّل وصفك، ثم أرسله للمعلم." },
];

function renderLandscapeDemo(stepId: string) {
  if (stepId === "pick") {
    return (
      <div className="tutorial-demo demo-pick" aria-label="تجربة سحب الوصف على الصورة">
        <div className="demo-drop" aria-hidden="true">
          <div className="demo-drop-label">الصورة</div>
          <img className="demo-drop-image" src={SAMPLE_IMAGE} alt="" loading="lazy" />
          <div className="demo-drop-success" aria-hidden="true">
            âœ“
          </div>
        </div>
        <div className="demo-card" aria-hidden="true">
          <div className="demo-card-pill">الوصف</div>
          <div className="demo-card-text">يمتد البحر مرآةً بنفسجية…</div>
          <div className="demo-cursor" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (stepId === "complete") {
    return (
      <div className="tutorial-demo demo-complete" aria-label="إكمال عدة مشاهد وشريط تقدم">
        <div className="demo-complete-strip" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="demo-thumb">
              <span className="demo-thumb-check">âœ“</span>
            </div>
          ))}
        </div>
        <div className="demo-progress" aria-hidden="true">
          <div className="demo-progress-bar" />
          <div className="demo-progress-label">اكتمل 6/6</div>
        </div>
        <div className="demo-complete-note" aria-hidden="true">
          كلما أكملت مشهدًا يقترب وصفك من الاكتمال
        </div>
      </div>
    );
  }

  if (stepId === "draft") {
    return (
      <div className="tutorial-demo demo-draft" aria-label="إنشاء مسودة من الاختيارات">
        <div className="demo-draft-top" aria-hidden="true">
          {["وصف 1", "وصف 2", "وصف 3", "وصف 4"].map((chip) => (
            <div key={chip} className="demo-draft-chip">
              {chip}
            </div>
          ))}
        </div>
        <button type="button" className="button demo-draft-button" tabIndex={-1} aria-hidden="true">
          إنشاء مسودة
        </button>
        <div className="demo-draft-paper" aria-hidden="true">
          <div className="demo-line w-90" />
          <div className="demo-line w-75" />
          <div className="demo-line w-95" />
          <div className="demo-line w-80" />
          <div className="demo-line w-60" />
        </div>
      </div>
    );
  }

  return renderSubmitDemo("إرسال", "مراجعة الوصف ثم الإرسال");
}

export const landscapeDescriptionTutorial: TutorialConfig = {
  steps,
  demo: renderLandscapeDemo,
};

