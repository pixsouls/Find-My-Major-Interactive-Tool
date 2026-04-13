interface MajorCardProps {
  title: string;
  description: string;
  onClick?: () => void;
}

export default function MajorCard({
  title,
  description,
  onClick,
}: MajorCardProps) {
  return (
    <div className="major-card" onClick={onClick}>
      <h3 className="major-title">{title}</h3>
      <p className="major-description">{description}</p>
    </div>
  );
}