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

interface CareerInfoPanelProps {
  selectedCareer: DisplayCareer | null;
  careerMajors: CareerMajor[];
}

export default function CareerInfoPanel({ selectedCareer, careerMajors }: CareerInfoPanelProps) {
  return (
    <div className="results-card">
      <h2>Career Information</h2>
      {selectedCareer ? (
        <ul className="career-info-list">
          <li>
            <strong>Title</strong>
            <p className="career-info-title">{selectedCareer.title}</p>
          </li>
          <li>
            <strong>Description</strong>
            <p className="career-info-description">{selectedCareer.description}</p>
          </li>
          <li>
            <strong>Related Majors</strong>
            {careerMajors.length > 0 ? (
              <ul className="career-majors-list">
                {careerMajors.map((m) => (
                  <li key={m.major_name} className="career-major-item">
                    {m.msu_url ? (
                      <a
                        href={m.msu_url}
                        target="_blank"
                        rel="noreferrer"
                        className="career-major-link"
                      >
                        {m.major_name}
                      </a>
                    ) : (
                      m.major_name
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="career-info-code">No majors found</p>
            )}
          </li>
          <li>
            <strong>Salary (Upper Quartile)</strong>
            <p className="career-info-code">
              -
            </p>
          </li>
          <li>
            <strong>Salary (Median)</strong>
            <p className="career-info-code">
              -
            </p>
          </li>
          <li>
            <strong>Salary (Lower Quartile)</strong>
            <p className="career-info-code">
              -
            </p>
          </li>
          <li>
            <strong>Source</strong>
            <p className="career-info-code">
              {selectedCareer.source === 'ml' ? 'AI Recommended' : 'Database Match'}
            </p>
          </li>
        </ul>
      ) : (
        <p className="career-info-empty">Select a career to see more information.</p>
      )}
    </div>
  );
}