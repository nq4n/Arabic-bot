import type { Activity } from "../data/topics";
import "../styles/ActivityContentPanel.css";

type ActivityContentPanelProps = {
  activities: Activity[];
  title?: string;
  description?: string;
  className?: string;
};

export default function ActivityContentPanel({
  activities,
  title = "محتوى النشاط",
  description = "أنجز الأنشطة الآتية بالترتيب، ثم انتقل إلى المهمة التفاعلية أو الإرسال.",
  className = "",
}: ActivityContentPanelProps) {
  if (activities.length === 0) return null;

  return (
    <section className={`activity-content-panel card ${className}`.trim()}>
      <div className="activity-content-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="activity-content-list">
        {activities.map((activity) => (
          <article
            key={`activity-content-${activity.activity}`}
            className="activity-content-card"
          >
            <div className="activity-content-card-header">
              <span className="activity-content-number">{activity.activity}</span>
              <i className={`${activity.icon} activity-content-icon`} aria-hidden="true"></i>
              <div>
                <h3>{activity.title ?? `نشاط ${activity.activity}`}</h3>
                <p>{activity.description}</p>
              </div>
            </div>

            {activity.objective && (
              <p className="activity-content-objective">
                <strong>الهدف:</strong> {activity.objective}
              </p>
            )}

            {activity.instructions && activity.instructions.length > 0 && (
              <ol className="activity-content-steps">
                {activity.instructions.map((instruction, index) => (
                  <li key={`activity-content-${activity.activity}-step-${index}`}>
                    {instruction}
                  </li>
                ))}
              </ol>
            )}

            {(activity.output || activity.example) && (
              <div className="activity-content-details">
                {activity.output && (
                  <p>
                    <strong>المطلوب:</strong> {activity.output}
                  </p>
                )}
                {activity.example && (
                  <p>
                    <strong>مثال:</strong> {activity.example}
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
