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

      {/* REMOVE BUTTON */}
      <button
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </button>

      <h3>{title}</h3>
      <p>{description}</p>

    </div>
  );
}