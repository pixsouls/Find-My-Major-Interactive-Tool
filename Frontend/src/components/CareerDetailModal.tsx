import './CareerDetailModal.css';

interface CareerMajor {
  major_name: string;
  match_strength: number;
  msu_url: string | null;
}

interface DisplayCareer {
  id: string;
  title: string;
  description: string;
  source: 'db' | 'ml';
}

interface CareerDetailModalProps {
  career: DisplayCareer;
  careerMajors: CareerMajor[];
  onClose: () => void;
}

export default function CareerDetailModal({ career, careerMajors, onClose }: CareerDetailModalProps) {
  return (
    <div className="career-modal-overlay" onClick={onClose}>
      <div className="career-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="career-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 className="career-modal-title">{career.title}</h2>

        <ul className="career-modal-fields">
          <li>
            <strong>Salary (Upper Quartile)</strong>
            <p>-</p>
          </li>
          <li>
            <strong>Salary (Median)</strong>
            <p>-</p>
          </li>
          <li>
            <strong>Salary (Lower Quartile)</strong>
            <p>-</p>
          </li>
          <li>
            <strong>Projected Growth</strong>
            <p>N/A</p>
          </li>
          <li>
            <strong>Job Satisfaction</strong>
            <p>N/A</p>
          </li>
        </ul>

        {careerMajors.some(m => m.msu_url) && (
          <div className="career-modal-majors">
            {careerMajors.map((m) => (
              m.msu_url ? (
                <a
                  key={m.major_name}
                  href={m.msu_url}
                  target="_blank"
                  rel="noreferrer"
                  className="career-modal-major-btn"
                >
                  Show me the MSU page for {m.major_name}
                </a>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  );
}