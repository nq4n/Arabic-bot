import { Navigate, useParams } from "react-router-dom";
import { topics } from "../data/topics";
import CollaborativeActivity from "./CollaborativeActivity";
import PeerDialogueActivity from "./PeerDialogueActivity";
import FreeExpressionActivity from "./FreeExpressionActivity";
import ReportAssemblyActivity from "./ReportAssemblyActivity";

/**
 * Unified activity entry point: routes each topic to the correct activity experience.
 * - مناقشة قضية    -> نشاط مناقشة جماعية (collaborative)
 * - النص الحواري   -> نشاط حوار ثنائي
 * - باقي الدروس     -> نشاط تفاعلي (تركيب/اختيار/تجميع) عبر ReportAssemblyActivity
 */
export default function Activity() {
  const { topicId } = useParams<{ topicId: string }>();
  const topic = topics.find((t) => t.id === topicId);
  const tutorialTopicIds = new Set([
    "landscape-description",
    "report-writing",
    "discussing-issue",
    "dialogue-text",
    "free-expression",
  ]);

  if (!topicId) {
    return <Navigate to="/" replace />;
  }

  if (!topic) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>النشاط غير متاح لهذا الدرس</h1>
          <p>تعذّر العثور على نشاط مرتبط بالموضوع الحالي.</p>
          <button className="button" onClick={() => window.history.back()}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  if (tutorialTopicIds.has(topic.id)) {
    const tutorialKey = `tutorial:${topic.id}`;
    const hasSeenTutorial = window.localStorage.getItem(tutorialKey) === "1";
    if (!hasSeenTutorial) {
      return <Navigate to={`/activity/${topic.id}/tutorial`} replace />;
    }
  }

  if (topic.id === "discussing-issue") {
    return <CollaborativeActivity />;
  }

  if (topic.id === "dialogue-text") {
    return <PeerDialogueActivity />;
  }

  if (topic.id === "free-expression") {
    return <FreeExpressionActivity />;
  }

  // Default: interactive assemble / scene-choice activity
  return <ReportAssemblyActivity />;
}
