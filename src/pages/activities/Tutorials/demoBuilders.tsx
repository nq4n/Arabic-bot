import type { AssembleDemoConfig, ChoiceDemoConfig } from "./types";

export function renderSubmitDemo(label: string, ariaLabel: string) {
  return (
    <div className="tutorial-demo demo-submit" aria-label={ariaLabel}>
      <div className="demo-submit-paper" aria-hidden="true">
        <div className="demo-line w-95" />
        <div className="demo-line w-85" />
        <div className="demo-line w-90 highlight" />
        <div className="demo-line w-70" />
      </div>
      <div className="demo-submit-actions" aria-hidden="true">
        <button type="button" className="button demo-submit-button" tabIndex={-1}>
          {label}
        </button>
        <div className="demo-submit-badge">تم الإرسال</div>
      </div>
    </div>
  );
}

export function createAssembleDemo(config: AssembleDemoConfig) {
  return (stepId: string) => {
    if (stepId === "order") {
      return (
        <div className="tutorial-demo demo-assemble-order" aria-label={`ترتيب ${config.partLabel}`}>
          <div className="demo-assemble-stack" aria-hidden="true">
            {config.parts.slice(0, 3).map((part, index) => (
              <div key={part} className={`demo-assemble-card card-${index + 1}`}>
                <span className="demo-assemble-tag">
                  {config.partLabel} {index + 1}
                </span>
                <span className="demo-assemble-text">{part}</span>
                <div className="demo-assemble-actions">
                  <span className="demo-assemble-arrow up">â–²</span>
                  <span className="demo-assemble-arrow down">â–¼</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (stepId === "draft") {
      return (
        <div className="tutorial-demo demo-draft demo-report-draft" aria-label="إنشاء المسودة">
          <div className="demo-draft-top" aria-hidden="true">
            {config.chips.map((chip) => (
              <div key={chip} className="demo-draft-chip">
                {chip}
              </div>
            ))}
          </div>
          <button type="button" className="button demo-draft-button" tabIndex={-1} aria-hidden="true">
            إنشاء مسودة
          </button>
          <div className="demo-draft-paper" aria-hidden="true">
            <div className="demo-line w-90" />
            <div className="demo-line w-75" />
            <div className="demo-line w-95" />
            <div className="demo-line w-80" />
            <div className="demo-line w-60" />
          </div>
        </div>
      );
    }

    if (stepId === "edit") {
      return (
        <div className="tutorial-demo demo-report-edit" aria-label="تحرير المسودة قبل الإرسال">
          <div className="demo-edit-paper" aria-hidden="true">
            <div className="demo-line w-95" />
            <div className="demo-line w-85" />
            <div className="demo-line w-90 highlight" />
            <div className="demo-line w-70" />
            <div className="demo-line w-80" />
            <div className="demo-edit-cursor" />
          </div>
          <div className="demo-edit-note" aria-hidden="true">
            {config.note}
          </div>
        </div>
      );
    }

    return renderSubmitDemo(config.submitLabel, "مراجعة العمل النهائي ثم الإرسال");
  };
}

export function createChoiceDemo(config: ChoiceDemoConfig) {
  return (stepId: string) => {
    if (stepId === "pick" || stepId === "read") {
      return (
        <div className="tutorial-demo demo-free-pick" aria-label="اختيار عناصر النشاط">
          {config.cards.map((card) => (
            <div
              key={`${card.label}-${card.text}`}
              className={`demo-free-prompt${card.selected ? " selected" : ""}`}
              aria-hidden="true"
            >
              <span className="demo-free-tag">{card.label}</span>
              <span className="demo-free-text">{card.text}</span>
            </div>
          ))}
        </div>
      );
    }

    if (stepId === "arrange" || stepId === "conflict") {
      return (
        <div className="tutorial-demo demo-free-preview" aria-label="معاينة الاختيارات قبل البناء">
          <div className="demo-free-preview-card" aria-hidden="true">
            <div className="demo-free-preview-title">{config.previewTitle}</div>
            <div className="demo-free-preview-detail">{config.previewText}</div>
          </div>
          <div className="demo-draft-top" aria-hidden="true">
            {config.chips.slice(0, 3).map((chip) => (
              <div key={chip} className="demo-draft-chip">
                {chip}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (stepId === "draft") {
      return (
        <div className="tutorial-demo demo-draft" aria-label="إنشاء المسودة">
          <div className="demo-draft-top" aria-hidden="true">
            {config.chips.map((chip) => (
              <div key={chip} className="demo-draft-chip">
                {chip}
              </div>
            ))}
          </div>
          <button type="button" className="button demo-draft-button" tabIndex={-1} aria-hidden="true">
            إنشاء مسودة
          </button>
          <div className="demo-draft-paper" aria-hidden="true">
            <div className="demo-line w-90" />
            <div className="demo-line w-75" />
            <div className="demo-line w-95" />
            <div className="demo-line w-80" />
            <div className="demo-line w-60" />
          </div>
        </div>
      );
    }

    return renderSubmitDemo(config.submitLabel, "مراجعة النص النهائي ثم الإرسال");
  };
}

