import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { topics } from "../data/topics";
import "../styles/LandscapeDescriptionTutorial.css";

type TutorialStep = {
  id: string;
  title: string;
  caption: string;
};

type TutorialConfig = {
  steps: TutorialStep[];
  demo: (stepId: string) => JSX.Element;
};

const LANDSCAPE_STEPS: TutorialStep[] = [
  {
    id: "pick",
    title: "اختيار الوصف",
    caption: "اسحب بطاقة الوصف وأسقطها فوق الصورة.",
  },
  {
    id: "complete",
    title: "إكمال المشاهد",
    caption: "كرّر الاختيار لكل صورة حتى يكتمل شريط التقدم.",
  },
  {
    id: "draft",
    title: "إنشاء المسودة",
    caption: "اجمع اختياراتك تلقائيًا في مسودة واحدة.",
  },
  {
    id: "submit",
    title: "المراجعة والإرسال",
    caption: "عدّل وصفك، ثم أرسله للمعلم.",
  },
];

const REPORT_STEPS: TutorialStep[] = [
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
  {
    id: "edit",
    title: "تحرير التقرير",
    caption: "عدّل المسودة وأضف التفاصيل التي تحتاجها.",
  },
  {
    id: "submit",
    title: "المراجعة والإرسال",
    caption: "راجع التقرير ثم أرسله للمعلم.",
  },
];

const DISCUSSION_STEPS: TutorialStep[] = [
  {
    id: "case",
    title: "اختيار القضية",
    caption: "اختر قضية للانضمام مع زملائك في النقاش.",
  },
  {
    id: "start",
    title: "بدء المناقشة",
    caption: "بعد الاختيار اضغط زر البدء للدخول للمجموعة.",
  },
  {
    id: "chat",
    title: "المشاركة بالأفكار",
    caption: "شارك رأيك واحترام آراء الآخرين مع توضيح الأدلة.",
  },
  {
    id: "finish",
    title: "إنهاء النشاط",
    caption: "عند الانتهاء ستظهر رسالة إكمال النشاط.",
  },
];

const DIALOGUE_STEPS: TutorialStep[] = [
  {
    id: "start",
    title: "بدء الحوار",
    caption: "اضغط زر البدء للبحث عن زميل للحوار.",
  },
  {
    id: "wait",
    title: "انتظار المطابقة",
    caption: "انتظر حتى يتم اختيار شريك للحوار.",
  },
  {
    id: "chat",
    title: "التبادل والحوار",
    caption: "تبادل الرسائل والأفكار مع زميلك وفق السيناريو.",
  },
  {
    id: "finish",
    title: "إنهاء النشاط",
    caption: "بعد اكتمال الحوار ستظهر رسالة الإنهاء.",
  },
];

const FREE_EXPRESSION_STEPS: TutorialStep[] = [
  {
    id: "choose",
    title: "اختيار المحفز",
    caption: "اختر نوع المحفز المناسب لكتابة التعبير.",
  },
  {
    id: "preview",
    title: "معاينة المحفز",
    caption: "اطّلع على التفاصيل أو الصورة قبل البدء.",
  },
  {
    id: "write",
    title: "كتابة التعبير",
    caption: "اكتب تعبيرك بأسلوبك الخاص.",
  },
  {
    id: "submit",
    title: "المراجعة والإرسال",
    caption: "راجع التعبير ثم أرسله للمعلم.",
  },
];

function renderLandscapeDemo(stepId: string) {
  const sampleImage =
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80";

  if (stepId === "pick") {
    return (
      <div className="tutorial-demo demo-pick" aria-label="تجربة سحب الوصف على الصورة">
        <div className="demo-drop" aria-hidden="true">
          <div className="demo-drop-label">الصورة</div>
          <img className="demo-drop-image" src={sampleImage} alt="" loading="lazy" />
          <div className="demo-drop-success" aria-hidden="true">
            ✓
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
              <span className="demo-thumb-check">✓</span>
            </div>
          ))}
        </div>
        <div className="demo-progress" aria-hidden="true">
          <div className="demo-progress-bar" />
          <div className="demo-progress-label">اكتمل 6/6</div>
        </div>
        <div className="demo-complete-note" aria-hidden="true">
          كلما أكملت مشهدًا… يقترب وصفك من الاكتمال
        </div>
      </div>
    );
  }

  if (stepId === "draft") {
    return (
      <div className="tutorial-demo demo-draft" aria-label="إنشاء مسودة من الاختيارات">
        <div className="demo-draft-top" aria-hidden="true">
          <div className="demo-draft-chip">وصف 1</div>
          <div className="demo-draft-chip">وصف 2</div>
          <div className="demo-draft-chip">وصف 3</div>
          <div className="demo-draft-chip">وصف 4</div>
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

  return (
    <div className="tutorial-demo demo-submit" aria-label="مراجعة النص ثم الإرسال">
      <div className="demo-submit-paper" aria-hidden="true">
        <div className="demo-line w-95" />
        <div className="demo-line w-85" />
        <div className="demo-line w-90 highlight" />
        <div className="demo-line w-70" />
      </div>
      <div className="demo-submit-actions" aria-hidden="true">
        <button type="button" className="button demo-submit-button" tabIndex={-1}>
          إرسال
        </button>
        <div className="demo-submit-badge">تم الإرسال</div>
      </div>
    </div>
  );
}

function renderReportDemo(stepId: string) {
  if (stepId === "order") {
    return (
      <div className="tutorial-demo demo-assemble-order" aria-label="ترتيب أجزاء التقرير">
        <div className="demo-assemble-stack" aria-hidden="true">
          <div className="demo-assemble-card card-1">
            <span className="demo-assemble-tag">الجزء 1</span>
            <span className="demo-assemble-text">مقدمة مختصرة عن الموضوع</span>
            <div className="demo-assemble-actions">
              <span className="demo-assemble-arrow up">▲</span>
              <span className="demo-assemble-arrow down">▼</span>
            </div>
          </div>
          <div className="demo-assemble-card card-2">
            <span className="demo-assemble-tag">الجزء 2</span>
            <span className="demo-assemble-text">تفاصيل أساسية بالترتيب</span>
            <div className="demo-assemble-actions">
              <span className="demo-assemble-arrow up">▲</span>
              <span className="demo-assemble-arrow down">▼</span>
            </div>
          </div>
          <div className="demo-assemble-card card-3">
            <span className="demo-assemble-tag">الجزء 3</span>
            <span className="demo-assemble-text">خاتمة موجزة وواضحة</span>
            <div className="demo-assemble-actions">
              <span className="demo-assemble-arrow up">▲</span>
              <span className="demo-assemble-arrow down">▼</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stepId === "draft") {
    return (
      <div className="tutorial-demo demo-draft demo-report-draft" aria-label="إنشاء مسودة التقرير">
        <div className="demo-draft-top" aria-hidden="true">
          <div className="demo-draft-chip">جزء 1</div>
          <div className="demo-draft-chip">جزء 2</div>
          <div className="demo-draft-chip">جزء 3</div>
          <div className="demo-draft-chip">جزء 4</div>
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

  if (stepId === "edit") {
    return (
      <div className="tutorial-demo demo-report-edit" aria-label="تحرير التقرير قبل الإرسال">
        <div className="demo-edit-paper" aria-hidden="true">
          <div className="demo-line w-95" />
          <div className="demo-line w-85" />
          <div className="demo-line w-90 highlight" />
          <div className="demo-line w-70" />
          <div className="demo-line w-80" />
          <div className="demo-edit-cursor" />
        </div>
        <div className="demo-edit-note" aria-hidden="true">
          يمكنك تعديل النص قبل الإرسال.
        </div>
      </div>
    );
  }

  return (
    <div className="tutorial-demo demo-submit" aria-label="مراجعة التقرير ثم الإرسال">
      <div className="demo-submit-paper" aria-hidden="true">
        <div className="demo-line w-95" />
        <div className="demo-line w-85" />
        <div className="demo-line w-90 highlight" />
        <div className="demo-line w-70" />
      </div>
      <div className="demo-submit-actions" aria-hidden="true">
        <button type="button" className="button demo-submit-button" tabIndex={-1}>
          إرسال التقرير
        </button>
        <div className="demo-submit-badge">تم الإرسال</div>
      </div>
    </div>
  );
}

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

function renderDialogueDemo(stepId: string) {
  if (stepId === "start") {
    return (
      <div className="tutorial-demo demo-dialogue-start" aria-label="بدء الحوار">
        <div className="demo-dialogue-card" aria-hidden="true">
          <span className="demo-dialogue-tag">سيناريو الحوار</span>
          <span className="demo-dialogue-text">
            ناقش مع زميلك فكرة من النص وقدّم رأيك بدليل.
          </span>
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

  return (
    <div className="tutorial-demo demo-submit" aria-label="إرسال التعبير الحر">
      <div className="demo-submit-paper" aria-hidden="true">
        <div className="demo-line w-95" />
        <div className="demo-line w-85" />
        <div className="demo-line w-90 highlight" />
        <div className="demo-line w-70" />
      </div>
      <div className="demo-submit-actions" aria-hidden="true">
        <button type="button" className="button demo-submit-button" tabIndex={-1}>
          إرسال التعبير
        </button>
        <div className="demo-submit-badge">تم الإرسال</div>
      </div>
    </div>
  );
}

const TUTORIAL_CONFIGS: Record<string, TutorialConfig> = {
  "landscape-description": {
    steps: LANDSCAPE_STEPS,
    demo: renderLandscapeDemo,
  },
  "report-writing": {
    steps: REPORT_STEPS,
    demo: renderReportDemo,
  },
  "discussing-issue": {
    steps: DISCUSSION_STEPS,
    demo: renderDiscussionDemo,
  },
  "dialogue-text": {
    steps: DIALOGUE_STEPS,
    demo: renderDialogueDemo,
  },
  "free-expression": {
    steps: FREE_EXPRESSION_STEPS,
    demo: renderFreeExpressionDemo,
  },
};

function TutorialDemo({
  render,
  stepId,
}: {
  render: (stepId: string) => JSX.Element;
  stepId: string;
}) {
  return render(stepId);
}

export default function LandscapeDescriptionTutorial() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);

  const tutorialConfig = topic ? TUTORIAL_CONFIGS[topic.id] : null;
  const steps = tutorialConfig?.steps ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [restartToken, setRestartToken] = useState(0);

  const step = useMemo(() => steps[activeIndex] ?? steps[0], [activeIndex, steps]);

  useEffect(() => {
    setActiveIndex(0);
  }, [topicId]);

  useEffect(() => {
    setRestartToken((prev) => prev + 1);
  }, [activeIndex]);

  useEffect(() => {
    if (!autoplay) return;
    if (steps.length === 0) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % steps.length);
    }, 6500);
    return () => window.clearInterval(intervalId);
  }, [autoplay, steps.length]);

  if (!topicId) {
    return <Navigate to="/" replace />;
  }

  if (!topic) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>الشرح غير متاح لهذا الدرس</h1>
          <p>تعذّر العثور على درس مرتبط بالموضوع الحالي.</p>
          <button className="button" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  if (!tutorialConfig) {
    return <Navigate to={`/activity/${topicId}`} replace />;
  }

  const goPrev = () =>
    setActiveIndex((prev) => (prev - 1 + steps.length) % steps.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % steps.length);

  return (
    <div className="landscape-tutorial-page" dir="rtl">
      <div className="landscape-tutorial-container">
        <header className="landscape-tutorial-header">
          <div>
            <h1 className="page-title">شرح النشاط: {topic.title}</h1>
            <p className="page-subtitle">
              شاهد الخطوات بشكل بصري… ثم ابدأ التطبيق الحقيقي.
            </p>
          </div>
          <div className="landscape-tutorial-header-actions">
            <button type="button" className="button button-compact" onClick={() => navigate(-1)}>
              رجوع
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                if (topic) {
                  window.localStorage.setItem(`tutorial:${topic.id}`, "1");
                }
                navigate(`/activity/${topicId}`);
              }}
            >
              ابدأ النشاط
            </button>
          </div>
        </header>

        <section className="card landscape-tutorial-card">
          <div className="tutorial-layout">
            <nav className="tutorial-stepper" aria-label="خطوات شرح النشاط">
              {steps.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`tutorial-step-btn${index === activeIndex ? " active" : ""}`}
                  onClick={() => setActiveIndex(index)}
                >
                  <span className="tutorial-step-number">{index + 1}</span>
                  <span className="tutorial-step-meta">
                    <span className="tutorial-step-title">{item.title}</span>
                    <span className="tutorial-step-caption">{item.caption}</span>
                  </span>
                </button>
              ))}
            </nav>

            <div className="tutorial-stage">
              <div className="tutorial-stage-head">
                <div className="tutorial-stage-title">{step.title}</div>
                <div className="tutorial-stage-caption">{step.caption}</div>
              </div>
              <div className="tutorial-stage-body">
                <TutorialDemo
                  key={`${step.id}-${restartToken}`}
                  render={tutorialConfig.demo}
                  stepId={step.id}
                />
              </div>
              <div className="tutorial-stage-actions">
                <button type="button" className="button button-compact" onClick={goPrev}>
                  السابق
                </button>
                <button
                  type="button"
                  className="button button-compact"
                  onClick={() => setRestartToken((prev) => prev + 1)}
                >
                  إعادة التشغيل
                </button>
                <label className="tutorial-autoplay">
                  <input
                    type="checkbox"
                    checked={autoplay}
                    onChange={(event) => setAutoplay(event.target.checked)}
                  />
                  تشغيل تلقائي
                </label>
                <button type="button" className="button button-compact" onClick={goNext}>
                  التالي
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
