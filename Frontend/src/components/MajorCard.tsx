interface MajorCardProps {
  title: string;
  description: string;
  onClick: () => void;
  onRemove: () => void;
  isAI?: boolean;
}

/**
 * Placeholder shown while its source (database or AI) is still loading.
 * Same 62px height as a real card, so filling it in moves nothing.
 */
export function MajorCardSkeleton() {
  return (
    <div className="major-card major-card-skeleton" aria-hidden="true">
      <div className="major-card-main">
        <span className="skeleton-line skeleton-title" />
        <span className="skeleton-line skeleton-description" />
      </div>
    </div>
  );
}

export default function MajorCard({
  title,
  description,
  onClick,
  onRemove,
  isAI = false,
}: MajorCardProps) {
  return (
    // Two sibling buttons rather than a clickable <div> wrapping a button:
    // nesting interactive elements is invalid and left the card mouse-only.
    <div className="major-card">
      <button type="button" className="major-card-main" onClick={onClick}>
        <span className="major-card-title">
          {isAI && (
            <>
              <span className="ai-sparkle" aria-hidden="true">✨</span>
              <span className="visually-hidden">AI recommended: </span>
            </>
          )}
          {title}
        </span>
        <span className="major-card-description">{description}</span>
      </button>
      <button
        type="button"
        className="remove-btn"
        onClick={onRemove}
        aria-label={`Remove ${title}`}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
