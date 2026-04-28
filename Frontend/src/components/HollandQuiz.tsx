import { useState } from 'react';
import { questions, options, type RiasecType } from '../data/types';
import ExploreMajors from './ExploreMajors';
import QuizCheckpoint from './QuizCheckpoint';
import { QuizQuestion } from './QuizQuestion';
import { selectNextQuestion } from '../algorithms/questionSelector';
import './HollandQuiz.css';
import ResultsPage from "./ResultsPage";

type QuizSnapshot = {
  currentQuestion: (typeof questions)[number];
  askedQuestionIds: number[];
  scores: Record<RiasecType, number>;
  showResults: boolean;
  isCheckpoint: boolean;
  isFinalCheckpoint: boolean;
  showExploreMajors: boolean;
  questionCount: number;
};


export default function HollandQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(questions[0]);
  const [askedQuestionIds, setAskedQuestionIds] = useState<number[]>([]);
  const [scores, setScores] = useState<Record<RiasecType, number>>({
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0
  });
  const [showResults, setShowResults] = useState(false);
  const [isCheckpoint, setIsCheckpoint] = useState(false);
  const [isFinalCheckpoint, setIsFinalCheckpoint] = useState(false);
  const [showExploreMajors, setShowExploreMajors] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [history, setHistory] = useState<QuizSnapshot[]>([]);

  // Email state
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  const questionsUntilCheckpoint = 12;

  const displayIndex = isCheckpoint ? questionCount : questionCount + 1;
  const displayCheckpoint = isCheckpoint
    ? Math.floor(questionCount / questionsUntilCheckpoint) * questionsUntilCheckpoint
    : Math.ceil((questionCount + 1) / questionsUntilCheckpoint) * questionsUntilCheckpoint;

  const progressPercentage = (questionCount / displayCheckpoint) * 100;

  const canGoBack = history.length > 0 && !showExploreMajors;

  const handleRestart = () => {
    setHistory([]);
    setCurrentQuestion(questions[0]);
    setAskedQuestionIds([]);
    setScores({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });
    setShowResults(false);
    setIsCheckpoint(false);
    setIsFinalCheckpoint(false);
    setShowExploreMajors(false);
    setQuestionCount(0);
  };

  const handleBack = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;

      const snapshot = prev[prev.length - 1];

      setCurrentQuestion(snapshot.currentQuestion);
      setAskedQuestionIds(snapshot.askedQuestionIds);
      setScores(snapshot.scores);
      setShowResults(snapshot.showResults);
      setIsCheckpoint(snapshot.isCheckpoint);
      setIsFinalCheckpoint(snapshot.isFinalCheckpoint);
      setShowExploreMajors(snapshot.showExploreMajors);
      setQuestionCount(snapshot.questionCount);

      return prev.slice(0, -1);
    });
  };

  const pushSnapshot = () => {
    const snapshot: QuizSnapshot = {
      currentQuestion,
      askedQuestionIds,
      scores,
      showResults,
      isCheckpoint,
      isFinalCheckpoint,
      showExploreMajors,
      questionCount
    };
    setHistory((prev) => [...prev, snapshot]);
  };

  const handleAnswer = (weight: number) => {
    pushSnapshot();

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
      const nextQuestion = selectNextQuestion(questions, newAskedIds, newScores);
      setIsFinalCheckpoint(!nextQuestion);
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
    pushSnapshot();

    setIsCheckpoint(false);
    setIsFinalCheckpoint(false);

    const nextQuestion = selectNextQuestion(questions, askedQuestionIds, scores);

    if (!nextQuestion) {
      setShowResults(true);
      return;
    }

    setCurrentQuestion(nextQuestion);
  };

  const handleContinueFromResults = () => {
    setShowResults(false);
    handleContinue();
  };

  const handleExploreMajors = () => {
    setShowResults(true);
  };

  const handleBackFromExplore = () => {
    setShowExploreMajors(false);
  };

  const sendEmail = async (topTrait: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Find My Major Result',
          text: `Your top trait is ${topTrait}.`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      alert('Email sent successfully!');
      setEmailSent(false);
      setEmail('');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  if (showResults) {
    return (
      <ResultsPage
        scores={scores}
        questionCount={questionCount}
        onRestart={handleRestart}
        onBack={handleBack}
        onContinue={handleContinueFromResults}
        canGoBack={canGoBack}
        email={email}
        setEmail={setEmail}
        emailSent={emailSent}
        setEmailSent={setEmailSent}
        sendEmail={sendEmail}
      />
    );
  }

  return (
    <main className="holland-quiz-container" aria-label="Holland RIASEC Quiz">
      <nav className="canvas-header" aria-label="Quiz progress">
        <div className="stat">
          <button
            type="button"
            className="quiz-back-btn"
            onClick={handleBack}
            disabled={!canGoBack}
            aria-label="Go back to the previous question"
          >
            Back
          </button>
          <span className="label" aria-live="polite" aria-atomic="true">
            QUESTION {displayIndex} / {displayCheckpoint}
          </span>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={Math.round(progressPercentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Quiz progress: question ${displayIndex} of ${displayCheckpoint}`}
          >
            <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
          </div>
          <button
            type="button"
            className="quiz-restart-btn"
            onClick={handleRestart}
            aria-label="Restart the quiz"
            title="Restart"
          >
            <span aria-hidden="true">↺</span>
          </button>
        </div>
      </nav>

      <div className="mod-card">
        <div className="card-main" aria-live="polite" aria-atomic="false">
          {showExploreMajors ? (
            <ExploreMajors scores={scores} onBack={handleBackFromExplore} />
          ) : isCheckpoint ? (
            <>
              <QuizCheckpoint
                scores={scores}
                onContinue={handleContinue}
                onExplore={handleExploreMajors}
                onViewResults={() => setShowResults(true)}
                isFinalCheckpoint={isFinalCheckpoint}
              />

              {!emailSent && (
                <button
                  className="save-results-button"
                  onClick={() => setEmailSent(true)}
                  aria-label="Save your current results by email"
                >
                  Save Results
                </button>
              )}

              {emailSent && (
                <div className="email-section" role="form" aria-label="Email results form">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="email-input"
                    aria-label="Email address"
                    aria-required="true"
                  />
                  <button
                    className="email-button"
                    onClick={() => sendEmail(Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0])}
                    aria-label="Send results to your email"
                  >
                    Send Results
                  </button>
                </div>
              )}
            </>
          ) : (
            <QuizQuestion
              question={currentQuestion}
              options={options}
              onAnswer={handleAnswer}
            />
          )}
        </div>
      </div>
    </main>
  );
}