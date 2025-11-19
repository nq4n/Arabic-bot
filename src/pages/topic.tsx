import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Topic.css";

export default function Topic() {
  const navigate = useNavigate();
  const { id } = useParams();

  // placeholder مثال — لاحقًا تستبدل بقيمة من API
  const topic = {
    title: "أهمية القراءة اليومية",
    grade: "الصف السادس",
    description: "اكتشف كيف نصيغ أفكارنا حول فوائد القراءة وأثرها على الفكر.",
    lesson:
      "القراءة اليومية تساعد على توسيع المعرفة وتحسين مهارات الكتابة وصياغة الأفكار. في هذا الدرس، سنتعرف على كيفية كتابة نص يوضح التأثير الإيجابي للقراءة في حياتنا.",
    sample:
      "القراءة اليومية تُعد من أهم العادات التي تنمّي الفكر وتزيد من القدرة على التعبير. فهي توسّع مداركنا وتعرّفنا على أفكار وتجارب جديدة...",
    questions: [
      "ما الفكرة الأساسية في هذا الموضوع؟",
      "كيف تؤثر القراءة اليومية على أسلوب الكتابة؟",
      "ما العناصر المهمة عند وصف فوائد القراءة؟",
    ],
  };

  return (
    <div className="topic-page" dir="rtl">
      {/* =======================
          رأس الصفحة
      ======================= */}
      <div className="topic-header">
        <span className="topic-grade">{topic.grade}</span>
        <h1>{topic.title}</h1>
        <p className="topic-description">{topic.description}</p>
      </div>

      <div className="topic-layout">
        {/* =======================
            كارت الدرس
        ======================= */}
        <div className="card topic-section">
          <h2 className="section-title">الدرس</h2>
          <p className="section-text">{topic.lesson}</p>

          <button className="button" style={{ marginTop: "1rem" }}>
            راجع الدرس
          </button>
        </div>

        {/* =======================
            نموذج الكتابة
        ======================= */}
        <div className="card topic-section">
          <h2 className="section-title">نموذج الكتابة</h2>
          <p className="section-text">{topic.sample}</p>

          <button className="button button-light" style={{ marginTop: "1rem" }}>
            قراءة النموذج
          </button>
        </div>

        {/* =======================
            أسئلة جاهزة
        ======================= */}
        <div className="card topic-section">
          <h2 className="section-title">أسئلة جاهزة</h2>

          <ul className="questions-list">
            {topic.questions.map((q, i) => (
              <li key={i}>• {q}</li>
            ))}
          </ul>

          <button
            className="button button-light"
            style={{ marginTop: "1rem" }}
            onClick={() => navigate(`/chat/${id}`)}
          >
            اطرح سؤالاً على الذكاء الاصطناعي
          </button>
        </div>
      </div>

      {/* =======================
          أزرار أسفل الصفحة
      ======================= */}
      <div className="topic-actions">
        <button className="button" onClick={() => navigate(`/write/${id}`)}>
          ابدأ كتابة نصك
        </button>

        <button className="button button-light" onClick={() => navigate(-1)}>
          العودة
        </button>
      </div>
    </div>
  );
}
