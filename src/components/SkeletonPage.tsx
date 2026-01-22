export default function SkeletonPage() {
  return (
    <div className="page-skeleton" dir="rtl" aria-busy="true" aria-live="polite">
      <div className="skeleton skeleton-title skeleton-w-40" />
      <div className="skeleton skeleton-line skeleton-w-60" />

      <section className="skeleton-surface">
        <div className="skeleton skeleton-line skeleton-w-40" />
        <div className="skeleton skeleton-line skeleton-w-80" />
        <div className="skeleton-grid">
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-block" />
        </div>
      </section>

      <section className="skeleton-surface">
        <div className="skeleton skeleton-line skeleton-w-40" />
        <div className="skeleton-list">
          <div className="skeleton skeleton-line skeleton-w-80" />
          <div className="skeleton skeleton-line skeleton-w-70" />
          <div className="skeleton skeleton-line skeleton-w-60" />
          <div className="skeleton skeleton-line skeleton-w-80" />
        </div>
      </section>
    </div>
  );
}
