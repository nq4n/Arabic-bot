import { useState } from "react";
import { supabase } from "../supabaseClient";
import "../styles/AboutUs.css";

const teamMembers = [
  {
    name: "مؤيد",
    role: "مطور الصفحة ومزود المحتوى",
    details: "تصميم البرمجيات وتوفير المحتوى التعليمي للمنصة.",
  },
  {
    name: "فريق التطوير",
    role: "البرمجة وتجربة المستخدم",
    details: "تصميم الواجهة، بناء المكونات التعليمية، وتكامل النظام مع قاعدة البيانات.",
  },
  {
    name: "المشرف الأكاديمي",
    role: "الإشراف التربوي",
    details: "مراجعة المحتوى وضمان مواءمته للأهداف التعليمية واللغة العربية السليمة.",
  },
];

const bookLinks = [
  {
    title: "فن الكتابة والتعبير",
    url: "https://www.noor-book.com/كتاب-فن-الكتابة-والتعبير-عن-الذات-pdf",
    description: "كتاب عربي يساعد على تطوير مهارات التعبير والكتابة الإبداعية.",
  },
  {
    title: "البلاغة الواضحة",
    url: "https://www.waqfeya.net/book.php?bid=742",
    description: "مرجع كلاسيكي في البلاغة وأساليب الكتابة العربية.",
  },
];

const externalLinks = [
  {
    title: "موسوعة ويكيبيديا العربية",
    url: "https://ar.wikipedia.org",
    description: "مصدر معرفي موثوق للبحث عن المعلومات العامة.",
  },
  {
    title: "موسوعة الملك عبدالله العربية للمحتوى الصحي",
    url: "https://kaimrc.med.sa",
    description: "محتوى عربي موثوق للمواضيع العلمية والصحية.",
  },
];

const programmingResources = [
  {
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    description: "مرجع شامل لتقنيات الويب الحديثة بالإنجليزية.",
  },
  {
    title: "freeCodeCamp بالعربية",
    url: "https://www.youtube.com/c/FreeCodeCampArabic",
    description: "قناة تعليمية تقدم شروحات برمجية باللغة العربية.",
  },
];

const renderLinks = (links: typeof bookLinks) => (
  <div className="about-links-grid">
    {links.map((link) => (
      <article key={link.title} className="card about-link-card">
        <h3>{link.title}</h3>
        <p>{link.description}</p>
        <a href={link.url} target="_blank" rel="noreferrer">
          زيارة الرابط
        </a>
      </article>
    ))}
  </div>
);

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

    // Attempt to get user name if logged in
    let userName = "زائر";
    if (session) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
      if (profile?.full_name) userName = profile.full_name;
    }

    const { error } = await supabase.from("user_feedback").insert({
      user_id: session?.user?.id || null,
      user_name: userName,
      email: email || session?.user?.email, // Use input email or session email
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
    <div className="about-page" dir="rtl">
      <header className="about-header">
        <h1>من نحن</h1>
        <p>تعرف على فريق المنصّة والمصادر التي نرشحها لدعم التعلم.</p>
      </header>

      <section className="about-section">
        <h2>فريق العمل</h2>
        <div className="about-team-grid">
          {teamMembers.map((member) => (
            <article key={member.role} className="card about-team-card">
              <h3>{member.name}</h3>
              <h4>{member.role}</h4>
              <p>{member.details}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2>أرسل لنا ملاحظاتك</h2>
        <div className="card feedback-form-card">
          <p>هل لديك اقتراح، مشكلة تقنية، أو ترغب في المساهمة بمحتوى؟ راسلنا هنا.</p>
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

      <section className="about-section">
        <h2>روابط الكتب</h2>
        {renderLinks(bookLinks)}
      </section>

      <section className="about-section">
        <h2>روابط خارجية</h2>
        {renderLinks(externalLinks)}
      </section>

      <section className="about-section">
        <h2>موارد برمجية</h2>
        {renderLinks(programmingResources)}
      </section>
    </div>
  );
}
