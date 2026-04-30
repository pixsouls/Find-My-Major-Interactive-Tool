import { useEffect } from 'react';
import { type RiasecType } from '../data/types';
import { saveScores } from '../utils/api';
import './QuizCheckpoint.css';
import './Email.css';

interface QuizCheckpointProps {
  scores: Record<RiasecType, number>;
  questionCount: number;  // add this
  onContinue: () => void;
  onExplore: () => void;
  onViewResults: () => void;
  isFinalCheckpoint: boolean;
}

export default function QuizCheckpoint({ scores, questionCount, onContinue, onExplore, onViewResults, isFinalCheckpoint }: QuizCheckpointProps) {
  const leadingTrait = Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0] as RiasecType;

  const traitNames: Record<RiasecType, string> = {
    R: 'Realistic',
    I: 'Investigative',
    A: 'Artistic',
    S: 'Social',
    E: 'Enterprising',
    C: 'Conventional'
  };

  useEffect(() => {
    saveScores(scores, questionCount);
  }, []);


  return (
    <section
      className="checkpoint-card"
      aria-labelledby="checkpoint-title"
      aria-live="polite"
    >
      <div className="checkpoint-header">
        <span className="type-tag" aria-hidden="true">CHECKPOINT</span>
        <h2 id="checkpoint-title">{isFinalCheckpoint ? "Assessment Complete" : "Progress Report"}</h2>
      </div>
      <div className="results-preview">
        {isFinalCheckpoint ? (
          <p>You've successfully completed the assessment! Click below to view your full results.</p>
        ) : (
          <>
            <p id="checkpoint-description">Based on your progress, you're showing a strong affinity for:</p>
            <div
              className="leading-badge"
              role="status"
              aria-describedby="checkpoint-description"
            >
              {traitNames[leadingTrait]}
            </div>
          </>
        )}
      </div>
      <div className="checkpoint-actions">
        {!isFinalCheckpoint && (
          <button
            className="secondary-btn explore-majors-btn"
            onClick={onExplore}
            aria-label="Explore majors based on your current results"
          >
            EXPLORE MAJORS
          </button>
        )}
        {isFinalCheckpoint ? (
          <button
            className="primary-btn"
            onClick={onViewResults}
            aria-label="View your full results"
          >
            VIEW FULL RESULTS
          </button>
        ) : (
          <button
            className="primary-btn"
            onClick={onContinue}
            aria-label="Continue to the next quiz questions"
          >
            CONTINUE QUIZ
          </button>
        )}
      </div>
    </section>
  );
}