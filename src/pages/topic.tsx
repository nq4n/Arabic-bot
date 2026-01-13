import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Activity, topics } from "../data/topics";
import {
  getActivityProgress,
  isLessonSectionActive,
  markLessonCompleted,
  toggleActivityCompletion,
} from "../utils/lessonSettings";
import { supabase } from "../supabaseClient";
import "../styles/Topic.css";
import type { Session } from "@supabase/supabase-js";

export default function Topic() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);
  const [activityProgress, setActivityProgress] = useState(() =>
    getActivityProgress(topicIds)
  );
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [activityResponse, setActivityResponse] = useState("");
  const [activitySubmissions, setActivitySubmissions] = useState<
    Record<number, { id: number; response_text: string | null; status: string }>
  >({});
  const [session, setSession] = useState<Session | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!topic) {
    return <div className="topic-page">الموضوع غير موجود</div>;
  }

  const isLessonActive = isLessonSectionActive(topicIds, topic.id, "lesson");
  const isReviewActive = isLessonSectionActive(topicIds, topic.id, "review");
  const completedActivities =
    activityProgress[topic.id]?.completedActivityIds ?? [];
  const activityCount = topic.activities.list.length;
  const completedActivityItems = topic.activities.list.filter((activity) =>
    completedActivities.includes(activity.activity)
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    const fetchActivitySubmissions = async () => {
      if (!session || !topic) return;
      setActivityError(null);
      const { data, error } = await supabase
        .from("activity_submissions")
        .select("id, activity_id, response_text, status")
        .eq("student_id", session.user.id)
        .eq("topic_id", topic.id);

      if (error) {
        setActivityError("تعذر تحميل تسليمات الأنشطة.");
        return;
      }

      const mapped = (data || []).reduce<
        Record<number, { id: number; response_text: string | null; status: string }>
      >((acc, item) => {
        acc[item.activity_id] = {
          id: item.id,
          response_text: item.response_text,
          status: item.status,
        };
        return acc;
      }, {});
      setActivitySubmissions(mapped);
    };

    fetchActivitySubmissions();
  }, [session, topic]);

  const openActivityModal = (activity: Activity) => {
    setSelectedActivity(activity);
    setActivityResponse(activitySubmissions[activity.activity]?.response_text || "");
  };

  const closeActivityModal = () => {
    setSelectedActivity(null);
    setActivityResponse("");
  };

  const handleSubmitActivity = async () => {
    if (!selectedActivity || !session || !topic) return;
    if (!activityResponse.trim()) {
      setActivityError("يرجى كتابة وصف أو ملخص للنشاط قبل الإرسال.");
      return;
    }

    setIsSubmitting(true);
    setActivityError(null);
    const { data, error } = await supabase
      .from("activity_submissions")
      .upsert(
        {
          student_id: session.user.id,
          topic_id: topic.id,
          activity_id: selectedActivity.activity,
          response_text: activityResponse,
          status: "submitted",
        },
        { onConflict: "student_id,topic_id,activity_id" }
      )
      .select("id, activity_id, response_text, status")
      .single();

    if (error) {
      setActivityError("تعذر إرسال النشاط للمعلم.");
    } else if (data) {
      setActivitySubmissions((prev) => ({
        ...prev,
        [data.activity_id]: {
          id: data.id,
          response_text: data.response_text,
          status: data.status,
        },
      }));
      setActivityProgress(
        toggleActivityCompletion(topicIds, topic.id, selectedActivity.activity)
      );
      closeActivityModal();
    }
    setIsSubmitting(false);
  };

  if (!isLessonActive) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>الدرس غير متاح حاليًا</h1>
          <p>تم إيقاف هذا الدرس من قبل المعلم. يرجى الرجوع لاحقًا.</p>
          <button className="button" onClick={() => navigate("/")}>
            العودة إلى قائمة المواضيع
          </button>
        </div>
      </div>
    );
  }
  
  if (!topic.lesson.header) {
     return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>قيد الإنشاء</h1>
          <p>عذرًا، محتوى هذا الموضوع لم يكتمل بعد. نعمل على إضافته قريبًا.</p>
          <button className="button" onClick={() => navigate("/")}>
            العودة إلى قائمة المواضيع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-page" dir="rtl">
      <header className="topic-main-header">
        <h1>{topic.lesson.header}</h1>
      </header>

      <div className="topic-content-wrapper">
        <div className="vertical-stack">
          <section className="topic-section card intro-card sequential-section">
            <h2 className="section-title">
              <i className="fas fa-book-open icon"></i> أولاً: تهيئة
            </h2>
            <p className="intro-paragraph">
              {topic.lesson.introduction.tahdid}
            </p>
            <p className="intro-paragraph">
              {topic.lesson.introduction.importance}
            </p>
          </section>
          <section className="topic-section card video-section sequential-section">
            <h2 className="section-title">
              <i className="fas fa-video icon"></i> فيديو توضيحي
            </h2>
            <div className="video-placeholder">
              <i className="fas fa-play-circle"></i>
            </div>
            <p>شرح مرئي لمقدمة الدرس وأهدافه.</p>
          </section>
        </div>

        <div className="vertical-stack">
          <section className="topic-section card sequential-section">
            <h2 className="section-title">
              <i className="fas fa-shoe-prints icon"></i> ثانيًا: خطوات الدرس
            </h2>
            <div className="steps-grid">
              {topic.lesson.steps.map((step) => (
                <div key={step.step} className="step-card">
                  <div className="step-header">
                    <i className={`${step.icon} step-icon`}></i>
                    <span className="step-number">الخطوة {step.step}</span>
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p>{step.description}</p>
                  {step.options && (
                    <ul className="options-list">
                      {step.options.map((option, index) => (
                        <li key={index}>{option}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="topic-section card sequential-section">
            <h2 className="section-title">
              <i className="fas fa-pencil-ruler icon"></i>{' '}
              {topic.activities.header}
            </h2>
            {activityError && <p className="error-message">{activityError}</p>}
            <div className="activity-progress">
              <span>تقدمك في الأنشطة</span>
              <span>
                {completedActivities.length}/{activityCount}
              </span>
            </div>
            <div className="activity-completed-panel">
              <h3>الأنشطة المنجزة</h3>
              {completedActivityItems.length === 0 ? (
                <p className="muted-note">لم تُنجز أي نشاط بعد.</p>
              ) : (
                <ul>
                  {completedActivityItems.map((activity) => (
                    <li key={activity.activity}>
                      <i className={`${activity.icon} activity-icon`}></i>
                      {activity.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ul className="activities-list">
              {topic.activities.list.map((activity) => (
                <li key={activity.activity}>
                  <label className="activity-item">
                    <input
                      type="checkbox"
                      checked={completedActivities.includes(activity.activity)}
                      onChange={() =>
                        setActivityProgress(
                          toggleActivityCompletion(
                            topicIds,
                            topic.id,
                            activity.activity
                          )
                        )
                      }
                    />
                    <span className="activity-text">
                      <i className={`${activity.icon} activity-icon`}></i>
                      {activity.description}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="button button-compact"
                    onClick={() => openActivityModal(activity)}
                  >
                    تفاصيل النشاط
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* زر الانتقال إلى المراجعة */}
      <div className="page-actions">
        <button
          className="button button-primary cta-button"
          onClick={() => {
            markLessonCompleted(topicIds, topic.id);
            navigate(`/lesson-review/${topic.id}`);
          }}
          disabled={!isReviewActive}
          aria-disabled={!isReviewActive}
        >
          <i className="fas fa-arrow-left"></i>
          فهمت الدرس، لننتقل للمراجعة
        </button>
        {!isReviewActive && (
          <p className="muted-note">قسم المراجعة غير متاح حاليًا لهذا الدرس.</p>
        )}
      </div>
      {selectedActivity && (
        <div className="activity-modal-backdrop">
          <div className="activity-modal card">
            <div className="activity-modal-header">
              <h3>شرح النشاط</h3>
              <button type="button" className="button button-compact" onClick={closeActivityModal}>
                إغلاق
              </button>
            </div>
            <p className="activity-modal-description">{selectedActivity.description}</p>
            <label className="activity-modal-label" htmlFor="activity-response">
              صف ما قمت به في هذا النشاط ليصل للمعلم:
            </label>
            <textarea
              id="activity-response"
              value={activityResponse}
              onChange={(event) => setActivityResponse(event.target.value)}
              rows={5}
              placeholder="اكتب ملخص النشاط أو ما تعلمته..."
            />
            <div className="activity-modal-actions">
              <button
                type="button"
                className="button"
                onClick={handleSubmitActivity}
                disabled={isSubmitting}
              >
                {isSubmitting ? "جاري الإرسال..." : "إرسال للمعلم"}
              </button>
              {activitySubmissions[selectedActivity.activity]?.status === "submitted" && (
                <span className="activity-status">
                  تم الإرسال
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
