import { type RiasecType } from '../data/types';
import './ExploreMajors.css';

interface ExploreMajorsProps {
  scores: Record<RiasecType, number>;
  onBack: () => void;
}

const traitNames: Record<RiasecType, string> = {
  R: 'Realistic',
  I: 'Investigative',
  A: 'Artistic',
  S: 'Social',
  E: 'Enterprising',
  C: 'Conventional',
};

const majorsByTrait: Record<RiasecType, string[]> = {
  R: ['Construction Management', 'Mechanical Engineering', 'Environmental Science', 'Aviation / Logistics'],
  I: ['Computer Science', 'Biology', 'Chemistry', 'Data Science / Analytics'],
  A: ['Graphic Design', 'Music', 'Theatre', 'Creative Writing'],
  S: ['Nursing', 'Psychology', 'Education', 'Social Work'],
  E: ['Business Management', 'Marketing', 'Entrepreneurship', 'Finance'],
  C: ['Accounting', 'Information Systems', 'Supply Chain / Operations', 'Public Administration'],
};

function getTopTraits(scores: Record<RiasecType, number>, count: number): RiasecType[] {
  return (Object.entries(scores) as Array<[RiasecType, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([trait]) => trait);
}

export default function ExploreMajors({ scores, onBack }: ExploreMajorsProps) {
  const topTraits = getTopTraits(scores, 3);

  return (
    <div className="explore-majors">
      <div className="explore-header">
        <span className="type-tag">EXPLORE YOUR PATH</span>
        <p className="explore-subtitle">
          Based on your current answers, your top traits are{' '}
          <strong>{topTraits.map(t => traitNames[t]).join(' · ')}</strong>.
        </p>
      </div>

      <div className="explore-content">
        {topTraits.map(trait => (
          <div key={trait} className="trait-block">
            <h3 className="trait-title">{traitNames[trait]}</h3>
            <ul className="major-list">
              {majorsByTrait[trait].map(major => (
                <li key={major} className="major-item">{major}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="explore-actions">
        <button className="secondary-btn msu-action-btn" onClick={onBack}>
          BACK
        </button>
      </div>
    </div>
  );
}