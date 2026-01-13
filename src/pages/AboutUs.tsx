import "../styles/AboutUs.css";

const teamMembers = [
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
  return (
    <div className="about-page" dir="rtl">
      <header className="about-header">
        <h1>من نحن</h1>
        <p>تعرف على فريق المنصّة والمصادر التي نرشحها لدعم التعلم.</p>
      </header>

      <section className="about-section">
        <h2>المبرمجون والمشرف</h2>
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

      <section className="card about-note">
        <h2>تواصل معنا</h2>
        <p>
          في حال رغبت بالمساهمة أو لديك اقتراحات لتحسين المحتوى، يسعدنا التواصل عبر
          بريد المنصة الرسمي.
        </p>
        <span className="about-email">support@medad.edu</span>
      </section>
    </div>
  );
}
