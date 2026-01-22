type SkeletonHeaderProps = {
  titleWidthClass?: string;
  subtitleWidthClass?: string;
};

type SkeletonSectionProps = {
  lines?: number;
  gridItems?: number;
  showTitle?: boolean;
  titleWidthClass?: string;
};

const lineWidths = ["skeleton-w-80", "skeleton-w-70", "skeleton-w-60", "skeleton-w-80"];

export function SkeletonHeader({
  titleWidthClass = "skeleton-w-40",
  subtitleWidthClass = "skeleton-w-60",
}: SkeletonHeaderProps) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      <div className={`skeleton skeleton-title ${titleWidthClass}`} />
      <div className={`skeleton skeleton-line ${subtitleWidthClass}`} />
    </div>
  );
}

export function SkeletonSection({
  lines = 3,
  gridItems = 0,
  showTitle = true,
  titleWidthClass = "skeleton-w-40",
}: SkeletonSectionProps) {
  return (
    <section className="skeleton-surface" aria-hidden="true">
      {showTitle && <div className={`skeleton skeleton-line ${titleWidthClass}`} />}
      <div className="skeleton-list">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={`skeleton-line-${index}`}
            className={`skeleton skeleton-line ${lineWidths[index % lineWidths.length]}`}
          />
        ))}
      </div>
      {gridItems > 0 && (
        <div className="skeleton-grid">
          {Array.from({ length: gridItems }).map((_, index) => (
            <div key={`skeleton-block-${index}`} className="skeleton skeleton-block" />
          ))}
        </div>
      )}
    </section>
  );
}

export function SkeletonCardGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={`skeleton-card-${index}`} className="skeleton skeleton-block" />
      ))}
    </div>
  );
}
