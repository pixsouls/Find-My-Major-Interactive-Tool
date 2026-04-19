interface MajorCardProps {
  title: string;
  description: string;
  onClick: () => void;
  onRemove: () => void;
}

export default function MajorCard({
  title,
  description,
  onClick,
  onRemove,
}: MajorCardProps) {
  return (
    <div className="major-card" onClick={onClick}>
      <div className="major-card-text">
        <span className="major-card-title">{title}</span>
        <span className="major-card-description">{description}</span>
      </div>
      <button
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${title}`}
      >
        ×
      </button>
    </div>
  );
}