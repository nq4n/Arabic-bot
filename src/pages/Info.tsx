import "../styles/Info.css";

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

export default function Info() {
  return (
    <div className="info-page" dir="rtl">
      <header className="info-header">
        <h1>معلومات المبرمجين والمشرف</h1>
        <p>تعرف على فريق العمل المسؤول عن تطوير المنصّة والإشراف عليها.</p>
      </header>

      <section className="info-grid">
        {teamMembers.map((member) => (
          <article key={member.role} className="card info-card">
            <h2>{member.name}</h2>
            <h3>{member.role}</h3>
            <p>{member.details}</p>
          </article>
        ))}
      </section>

      <section className="card info-note">
        <h2>تواصل معنا</h2>
        <p>
          في حال رغبت بالمساهمة أو لديك اقتراحات لتحسين المحتوى، يسعدنا التواصل عبر
          بريد المنصة الرسمي.
        </p>
        <span className="info-email">support@medad.edu</span>
      </section>
    </div>
  );
}
