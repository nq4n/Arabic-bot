import { useState } from "react";
import { supabase } from "../supabaseClient";
import "../styles/AboutUs.css";

// Define the shape of each team member.
type TeamMember = {
  name?: string;
  role: string;
  details: string;
  badge?: string;
  imageUrl?: string;
};

// Team members data.
const teamMembers: TeamMember[] = [
  {
    name: "م. مؤيد",
    role: "فريق التطوير والبرمجة",
    badge: "Development",
    imageUrl: "/profile.png",
    details: "المسؤول عن تصميم واجهة المستخدم، بناء منطق الدروس التفاعلية، وتطوير البنية التحتية للنظام وربطه بالذكاء الاصطناعي.",
  },
  {
    name: "مدير المحتوى",
    role: "مدير المحتوى والتعليم",
    badge: "Content",
    imageUrl: "/profile.png",
    details: "الإشراف على إعداد المادة العلمية، صياغة الأنشطة والتمارين، والتأكد من جودة وتنوع المحتوى التعليمي في المنصة.",
  },
  {
    name: "المشرف الأكاديمي",
    role: "المشرف والأكاديمي",
    badge: "Supervision",
    imageUrl: "/profile.png",
    details: "مراجعة المخرجات التعليمية، التأكد من سلامة اللغة العربية، وضمان توافق المنصة مع المعايير التربوية الحديثة.",
  },
];

export default function AboutUs() {
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [messageType, setMessageType] = useState("suggestion");
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSending(true);
    setStatusMessage(null);

    const { data: { session } } = await supabase.auth.getSession();

    let userName = "زائر";
    if (session) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
      if (profile?.full_name) userName = profile.full_name;
    }

    const { error } = await supabase.from("user_feedback").insert({
      user_id: session?.user?.id || null,
      user_name: userName,
      email: email || session?.user?.email,
      message: feedback,
      message_type: messageType
    });

    if (error) {
      console.error("Error sending feedback:", error);
      setStatusMessage({ text: "حدث خطأ أثناء إرسال ملاحظاتك. يرجى المحاولة لاحقاً.", type: "error" });
    } else {
      setStatusMessage({ text: "تم إرسال ملاحظاتك بنجاح! شكراً لمساهمتك.", type: "success" });
      setFeedback("");
      setEmail("");
    }
    setIsSending(false);
  };

  return (
    <div className="about-page page" dir="rtl">
      <header className="about-header page-header">
        <h1 className="page-title">منصة مداد لتعليم التعبير</h1>
        <p className="page-subtitle">
          حلول تقنية ذكية تهدف إلى تمكين الطلاب من مهارات الكتابة والإبداع اللغوي بأسلوب تفاعلي حديث.
        </p>
      </header>

      <div className="info-highlights">
        <div className="info-highlight card">
          <span className="info-highlight-title">رؤيتنا</span>
          <span className="info-highlight-text">
            أن تكون "مداد" المنصة الرائدة في تحويل عملية تعلّم الكتابة إلى رحلة ممتعة وشخصية لكل طالب.
          </span>
        </div>
        <div className="info-highlight card">
          <span className="info-highlight-title">رسالتنا</span>
          <span className="info-highlight-text">
            استثمار الذكاء الاصطناعي والتقنيات الحديثة لتقديم ملاحظات فورية ودقيقة تساعد الطالب على تطوير أسلوبه.
          </span>
        </div>
        <div className="info-highlight card">
          <span className="info-highlight-title">قيمنا</span>
          <span className="info-highlight-text">
            الدقة اللغوية، الابتكار التقني، والتركيز على رحلة المتعلم كأولوية في كل ميزة نطورها.
          </span>
        </div>
      </div>

      <section className="about-section">
        <h2 className="section-title">فريق العمل والإشراف</h2>
        <div className="members-grid">
          {teamMembers.map((member, idx) => (
            <article key={`${member.role}-${idx}`} className="member-profile-card card">
              <div className="member-avatar-wrapper">
                <img
                  src={member.imageUrl || "/profile.png"}
                  alt={member.name || member.role}
                  className="member-avatar-img"
                />
              </div>
              <div className="member-info">
                <div className="member-name">{member.name || "اسم العضو"}</div>
                <div className="member-role">
                  {member.role}
                  {member.badge && (
                    <span className="member-badge">{member.badge}</span>
                  )}
                </div>
                <p className="member-details">{member.details}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2 className="section-title">المصادر والمراجع</h2>
        <div className="resources-grid">
          <article className="resource-card card">
            <div className="resource-icon">
              <i className="fas fa-book"></i>
            </div>
            <div className="resource-info">
              <h3 className="resource-title">كتاب المادة التعليمية</h3>
              <p className="resource-desc">المرجع الأساسي المعتمد للمحتوى التعليمي من وزارة التربية والتعليم.</p>
              <a
                href="https://lib.moe.gov.om/home/items/content/49361/56965#book/"
                target="_blank"
                rel="noopener noreferrer"
                className="resource-link"
              >
                تصفح الكتاب <i className="fas fa-external-link-alt"></i>
              </a>
            </div>
          </article>

          <article className="resource-card card">
            <div className="resource-icon">
              <i className="fab fa-wikimedia-commons"></i>
            </div>
            <div className="resource-info">
              <h3 className="resource-title">ويكيميديا كومنز</h3>
              <p className="resource-desc">تم الاستعانة بمصادر وسائط من ويكيميديا لتعزيز المحتوى البصري في المنصة.</p>
              <a
                href="https://commons.wikimedia.org"
                target="_blank"
                rel="noopener noreferrer"
                className="resource-link"
              >
                الموقع الرسمي <i className="fas fa-external-link-alt"></i>
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="about-section">
        <h2 className="section-title">تواصل معنا</h2>
        <div className="card feedback-form-card">
          <p className="contact-text">هل لديك اقتراح، مشكلة تقنية، أو ترغب في المساهمة بمحتوى؟ راسلنا هنا.</p>
          <form onSubmit={handleFeedbackSubmit} className="feedback-form">
            <div className="form-group">
              <label>نوع الرسالة</label>
              <select value={messageType} onChange={(e) => setMessageType(e.target.value)}>
                <option value="suggestion">اقتراح</option>
                <option value="content_contribution">مساهمة بمحتوى</option>
                <option value="technical_issue">مشكلة تقنية</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div className="form-group">
              <label>البريد الإلكتروني (اختياري)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>

            <div className="form-group">
              <label>الرسالة</label>
              <textarea
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                required
              />
            </div>

            {statusMessage && (
              <div className={`status-message ${statusMessage.type}`}>
                {statusMessage.text}
              </div>
            )}

            <button type="submit" className="button button-primary" disabled={isSending}>
              {isSending ? "جاري الإرسال..." : "إرسال"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
