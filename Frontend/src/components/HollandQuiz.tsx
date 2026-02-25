import { useState } from 'react';
import { questions, options, type RiasecType } from '../data/types';
import QuizCheckpoint from './QuizCheckpoint';
import { QuizQuestion } from './QuizQuestion';
import './HollandQuiz.css';

export default function HollandQuiz() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<RiasecType, number>>({
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0
  });
  const [showResults, setShowResults] = useState(false);  
  const [isCheckpoint, setIsCheckpoint] = useState(false);

  const currentQuestion = questions[currentIndex];
  const questionsUntilCheckpoint = 6;

  // For checkpoint screen, show previous checkpoint numbers (e.g., 6/6)
  const displayIndex = isCheckpoint ? currentIndex : currentIndex + 1;
  const displayCheckpoint = isCheckpoint
    ? Math.floor(currentIndex / questionsUntilCheckpoint) * questionsUntilCheckpoint
    : Math.ceil((currentIndex + 1) / questionsUntilCheckpoint) * questionsUntilCheckpoint;

  // Progress bar should show completed questions out of checkpoint
  const progressPercentage = (currentIndex / displayCheckpoint) * 100;

  const handleAnswer = (weight: number) => {
    // Update scores
    setScores(prev => ({
      ...prev,
      [currentQuestion.type]: prev[currentQuestion.type] + weight
    }));

    const nextIndex = currentIndex + 1;

    // Check if quiz is complete
    if (nextIndex >= questions.length) {
      setShowResults(true);
      return;
    }

    // Check if we hit a checkpoint (every 6 questions)
    if (nextIndex % questionsUntilCheckpoint === 0) {
      setCurrentIndex(nextIndex);
      setIsCheckpoint(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const handleContinue = () => {
    setIsCheckpoint(false);
  };

  if (showResults) {
    const topTrait = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

    return (
      <div className="holland-quiz-container results-view">
        {/* Progress Header */}
        <div className="canvas-header">
          <div className="stat">
            <span className="label">
              QUESTION {currentIndex} / {currentIndex}
            </span>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div className="mod-card" style={{ borderRadius: '12px' }}>
          <h2>Evaluation Complete</h2>
          <p>Primary Archetype: <strong style={{ color: 'var(--accent-primary)' }}>{topTrait}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="holland-quiz-container">

      {/* Progress Header */}
      <div className="canvas-header">
        <div className="stat">
          <span className="label">
            QUESTION {displayIndex} / {displayCheckpoint}
          </span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mod-card">
        <div className="card-main">
          {isCheckpoint ? (
            <QuizCheckpoint
              scores={scores}
              onContinue={handleContinue}
              onExplore={() => console.log("Exploring with scores:", scores)}
            />
          ) : (
            <QuizQuestion
              question={currentQuestion}
              options={options}
              onAnswer={handleAnswer}
            />
          )}
        </div>
      </div>
    </div>
  );
}