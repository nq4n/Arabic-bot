import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ActivityContentPanel from "../components/ActivityContentPanel";
import { topics } from "../data/topics";
import "../styles/LessonActivityPage.css";

const tutorialTopicIds = new Set([
  "landscape-description",
  "report-writing",
  "discussing-issue",
  "dialogue-text",
  "free-expression",
]);

const getActivityMode = (topicId: string, type?: string) => {
  if (topicId === "discussing-issue") return "نقاش جماعي";
  if (topicId === "dialogue-text") return "حوار ثنائي";
  if (topicId === "free-expression") return "كتابة تعبير حر";
  if (type === "scene-choice") return "اختيار وتحليل";
  return "ترتيب وبناء";
};

export default function LessonActivityPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((item) => item.id === topicId);

  const hasTutorial = Boolean(topic && tutorialTopicIds.has(topic.id));
  const taskPath = topic ? `/activity/${topic.id}/task` : "/";
  const tutorialPath = topic ? `/activity/${topic.id}/tutorial` : "/";
  const startPath = useMemo(() => {
    if (!topic || !hasTutorial) return taskPath;
    const hasSeenTutorial = window.localStorage.getItem(`tutorial:${topic.id}`) === "1";
    return hasSeenTutorial ? taskPath : tutorialPath;
  }, [hasTutorial, taskPath, topic, tutorialPath]);

  if (!topic) {
    return (
      <div className="lesson-activity-page" dir="rtl">
        <div className="not-found-container">
          <h1>النشاط غير متاح لهذا الدرس</h1>
          <p>تعذر العثور على صفحة نشاط مرتبطة بالدرس الحالي.</p>
          <button className="button" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  const activities = topic.activities?.list ?? [];
  const activityMode = getActivityMode(topic.id, topic.interactiveActivity?.type);
  const hasInteractiveTask =
    Boolean(topic.interactiveActivity) ||
    topic.id === "discussing-issue" ||
    topic.id === "dialogue-text";

  return (
    <div className="lesson-activity-page" dir="rtl">
      <header className="lesson-activity-header page-header">
        <div>
          <p className="lesson-activity-kicker">صفحة نشاط الدرس</p>
          <h1 className="page-title">{topic.activities.header}</h1>
          <p className="page-subtitle">{topic.title}</p>
        </div>
        <div className="lesson-activity-meta">
          <span>{activityMode}</span>
          <span>الفصل {topic.semester}</span>
        </div>
      </header>

      <div className="lesson-activity-layout">
        <ActivityContentPanel
          activities={activities}
          title="أنشطة هذا الدرس"
          description="هذه الأنشطة مصممة لهذا الدرس تحديدا. أنجزها بالترتيب، ثم انتقل إلى التطبيق العملي."
        />

        <aside className="lesson-activity-side card">
          <h2>التطبيق العملي</h2>
          <p>
            بعد تنفيذ الأنشطة، انتقل إلى أداة التطبيق الخاصة بهذا الدرس لإرسال العمل
            أو المشاركة في النشاط.
          </p>

          {topic.writingPrompts?.list?.length > 0 && (
            <div className="lesson-activity-prompts">
              <h3>{topic.writingPrompts.header}</h3>
              <ul>
                {topic.writingPrompts.list.slice(0, 3).map((prompt, index) => (
                  <li key={`${topic.id}-activity-prompt-${index}`}>{prompt}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="lesson-activity-actions">
            <button type="button" className="button" onClick={() => navigate(`/topic/${topic.id}`)}>
              العودة إلى الدرس
            </button>
            {hasTutorial && (
              <button type="button" className="button button-compact" onClick={() => navigate(tutorialPath)}>
                شرح النشاط
              </button>
            )}
            {hasInteractiveTask && (
              <button type="button" className="button button-primary" onClick={() => navigate(startPath)}>
                ابدأ التطبيق
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
