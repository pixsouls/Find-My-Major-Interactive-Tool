import { type RiasecType } from '../data/types';
import './QuizCheckpoint.css';

interface QuizCheckpointProps {
  scores: Record<RiasecType, number>;
  onContinue: () => void;
  onExplore: () => void;
  isFinalCheckpoint: boolean; // Final Checkpoint
}

export default function QuizCheckpoint({ scores, onContinue, onExplore, isFinalCheckpoint }: QuizCheckpointProps) {
  // Find the current highest scoring trait
  const leadingTrait = Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0] as RiasecType;

  // Map the single letter to the full name
  const traitNames: Record<RiasecType, string> = {
    R: 'Realistic',
    I: 'Investigative',
    A: 'Artistic',
    S: 'Social',
    E: 'Enterprising',
    C: 'Conventional'
  };

  return (
    <div className="checkpoint-card">
      <div className="checkpoint-header">
        <span className="type-tag">CHECKPOINT</span>
        <h2>{isFinalCheckpoint ? "Assessment Complete" : "Progress Report"}</h2>
      </div>

      <div className="results-preview">
        {isFinalCheckpoint ? (
          <p>You’ve successfully completed the assessment! Click below to view your full results.</p>
        ) : (
          <>
            <p>Based on your progress, you're showing a strong affinity for:</p>
            <div className="leading-badge">
              {traitNames[leadingTrait]}
            </div>
          </>
        )}
      </div>

      <div className="checkpoint-actions">
        {!isFinalCheckpoint && ( // only show during mid checkpoints
          <button
            className="secondary-btn explore-majors-btn"
            onClick={onExplore}
          >
            EXPLORE MAJORS
          </button>
        )}

        {isFinalCheckpoint ? ( 
          <button
            className="primary-btn"
            onClick={onContinue}
          >
            VIEW FULL RESULTS
          </button>
        ) : (
          <button
            className="primary-btn"
            onClick={onContinue}
          >
            CONTINUE QUIZ
          </button>
        )}
      </div>
    </div>
  );
}