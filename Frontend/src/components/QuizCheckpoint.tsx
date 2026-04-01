import { type RiasecType } from '../data/types';
import './QuizCheckpoint.css';

interface QuizCheckpointProps {
  scores: Record<RiasecType, number>;
  onContinue: () => void;
  onExplore: () => void;
}

export default function QuizCheckpoint({ scores, onContinue, onExplore }: QuizCheckpointProps) {
  const leadingTrait = Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0] as RiasecType;

  const traitNames: Record<RiasecType, string> = {
    R: 'Realistic',
    I: 'Investigative',
    A: 'Artistic',
    S: 'Social',
    E: 'Enterprising',
    C: 'Conventional'
  };

  return (
    <section
      className="checkpoint-card"
      aria-labelledby="checkpoint-title"
      aria-live="polite"
    >
      <header className="checkpoint-header">
        <span className="type-tag" aria-hidden="true">CHECKPOINT</span>
        <h2 id="checkpoint-title">Progress Report</h2>
      </header>

      <div className="results-preview">
        <p id="checkpoint-description">
          Based on your progress, you're showing a strong affinity for:
        </p>

        <div
          className="leading-badge"
          role="status"
          aria-describedby="checkpoint-description"
        >
          {traitNames[leadingTrait]}
        </div>
      </div>

      <div className="checkpoint-actions">
        <button
          className="secondary-btn explore-majors-btn"
          onClick={onExplore}
          aria-label="Explore majors based on your current results"
        >
          Explore Majors
        </button>

        <button
          className="primary-btn"
          onClick={onContinue}
          aria-label="Continue to the next quiz questions"
        >
          Continue Quiz
        </button>
      </div>
    </section>
  );
}