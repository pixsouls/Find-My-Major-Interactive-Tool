import { useState } from 'react';
import { questions, options } from '../data/types';
import type { RiasecType } from '../data/types';
import ExploreMajors from './ExploreMajors';
import QuizCheckpoint from './QuizCheckpoint';
import { QuizQuestion } from './QuizQuestion';
import { selectNextQuestion } from '../algorithms/questionSelector.ts';
import './HollandQuiz.css';

export default function HollandQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(questions[0]);
  const [askedQuestionIds, setAskedQuestionIds] = useState<number[]>([]);
  const [scores, setScores] = useState<Record<RiasecType, number>>({
    R: 0,
    I: 0,
    A: 0,
    S: 0,
    E: 0,
    C: 0
  });

  const [showResults, setShowResults] = useState(false);
  const [isCheckpoint, setIsCheckpoint] = useState(false);
  const [showExploreMajors, setShowExploreMajors] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  const questionsUntilCheckpoint = 12;

  const displayIndex = isCheckpoint ? questionCount : questionCount + 1;

  const displayCheckpoint = isCheckpoint
    ? Math.floor(questionCount / questionsUntilCheckpoint) * questionsUntilCheckpoint
    : Math.ceil((questionCount + 1) / questionsUntilCheckpoint) * questionsUntilCheckpoint;

  const progressPercentage = (questionCount / displayCheckpoint) * 100;

  const handleAnswer = (weight: number) => {

    const weightMap: Record<number, number> = {
      1: -2,
      2: -1,
      3: 0,
      4: 1,
      5: 2
    };

    const newScores = {
      ...scores,
      [currentQuestion.type]: scores[currentQuestion.type] + weightMap[weight]
    };

    setScores(newScores);

    const sortedScores = Object.entries(newScores)
      .sort((a, b) => b[1] - a[1])
      .map(([type, score]) => `${type}: ${score}`)
      .join(', ');

    console.log(`📊 Scores (Highest→Lowest): ${sortedScores}`);

    const newAskedIds = [...askedQuestionIds, currentQuestion.id];
    setAskedQuestionIds(newAskedIds);

    const newCount = questionCount + 1;
    setQuestionCount(newCount);

    if (newCount % questionsUntilCheckpoint === 0) {
      setIsCheckpoint(true);
      return;
    }

    const nextQuestion = selectNextQuestion(questions, newAskedIds, newScores);

    if (!nextQuestion) {
      setShowResults(true);
      return;
    }

    setCurrentQuestion(nextQuestion);
  };

  const handleContinue = () => {

    setIsCheckpoint(false);

    const nextQuestion = selectNextQuestion(questions, askedQuestionIds, scores);

    if (!nextQuestion) {
      setShowResults(true);
      return;
    }

    setCurrentQuestion(nextQuestion);
  };

  const handleExploreMajors = () => {
    setShowExploreMajors(true);
  };

  const handleBackFromExplore = () => {
    setShowExploreMajors(false);
  };

  if (showResults) {

    const topTrait = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0][0];

    return (
      <div className="holland-quiz-container results-view">

        <div className="canvas-header">
          <div className="stat">
            <span className="label">
              QUESTION {questionCount} / {questionCount}
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
          <p>
            Primary Archetype:
            <strong style={{ color: 'var(--msu-red)' }}> {topTrait}</strong>
          </p>
        </div>

      </div>
    );
  }

  return (
    <div className="holland-quiz-container">

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

      <div className="mod-card">
        <div className="card-main">

          {showExploreMajors ? (

            <ExploreMajors
              scores={scores}
              onBack={handleBackFromExplore}
            />

          ) : isCheckpoint ? (

            <QuizCheckpoint
              scores={scores}
              onContinue={handleContinue}
              onExplore={handleExploreMajors}
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