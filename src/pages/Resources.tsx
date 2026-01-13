import "../styles/Resources.css";

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
  <div className="resources-grid">
    {links.map((link) => (
      <article key={link.title} className="card resource-card">
        <h3>{link.title}</h3>
        <p>{link.description}</p>
        <a href={link.url} target="_blank" rel="noreferrer">
          زيارة الرابط
        </a>
      </article>
    ))}
  </div>
);

export default function Resources() {
  return (
    <div className="resources-page" dir="rtl">
      <header className="resources-header">
        <h1>قسم الروابط والمراجع</h1>
        <p>مصادر مختارة تساعدك في القراءة، البحث، وتعلم البرمجة.</p>
      </header>

      <section className="resources-section">
        <h2>روابط الكتب</h2>
        {renderLinks(bookLinks)}
      </section>

      <section className="resources-section">
        <h2>روابط خارجية</h2>
        {renderLinks(externalLinks)}
      </section>

      <section className="resources-section">
        <h2>موارد برمجية</h2>
        {renderLinks(programmingResources)}
      </section>
    </div>
  );
}
