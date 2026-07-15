import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { topics } from "../../../data/topics";
import "../../../styles/LandscapeDescriptionTutorial.css";
import { TUTORIAL_CONFIGS } from "./configs";

function TutorialDemo({
  render,
  stepId,
}: {
  render: (stepId: string) => ReactElement;
  stepId: string;
}) {
  return render(stepId);
}

export default function TutorialPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((item) => item.id === topicId);
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
    if (!autoplay || steps.length === 0) return;
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
    return <Navigate to={`/activity/${topicId}/task`} replace />;
  }

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + steps.length) % steps.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % steps.length);

  return (
    <div className="landscape-tutorial-page" dir="rtl">
      <div className="landscape-tutorial-container">
        <header className="landscape-tutorial-header">
          <div>
            <h1 className="page-title">شرح النشاط: {topic.title}</h1>
            <p className="page-subtitle">شاهد الخطوات بشكل بصري، ثم انتقل إلى التطبيق الحقيقي.</p>
          </div>
          <div className="landscape-tutorial-header-actions">
            <button type="button" className="button button-compact" onClick={() => navigate(`/topic/${topic.id}`)}>
              العودة إلى الدرس
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => navigate(`/activity/${topicId}/task`)}
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
                <TutorialDemo key={`${step.id}-${restartToken}`} render={tutorialConfig.demo} stepId={step.id} />
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

