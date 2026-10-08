import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly headerAction?: ReactNode;
}

export function CollapsibleSection({ title, children, className, headerAction }: CollapsibleSectionProps) {
  const id = `section-${title.toLowerCase().replaceAll(' ', '-')}`;
  const contentId = `${id}-content`;
  const [expanded, setExpanded] = useState(true);

  return <section className={`sheet-section${className ? ` ${className}` : ''}`} aria-labelledby={id}>
    <div className="section-heading">
      <h2 id={id}>
        <button
          type="button"
          className="section-trigger"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((current) => !current)}
        >
          <span>{title}</span><span className="section-trigger-icon" aria-hidden="true">⌄</span>
        </button>
      </h2>
      {headerAction}
    </div>
    <div id={contentId} hidden={!expanded}>{children}</div>
  </section>;
}
