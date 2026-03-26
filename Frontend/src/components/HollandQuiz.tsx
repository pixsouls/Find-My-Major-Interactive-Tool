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

  // email
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

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

  // Back button
  const handleBack = () => {
    if (currentIndex === 0) return; // Can't go back from the first question
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    setIsCheckpoint(false); // Going back should exit checkpoint if we were in it
  };

  const handleContinue = () => {
    setIsCheckpoint(false);
  };

  // email 
  const sendEmail = async (topTrait: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Your Holland Code Results',
          text: `Your top trait is ${topTrait}.`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      alert('Email sent successfully!');
      setEmailSent(false);
    } catch (error) {
      console.error('Error sending email:', error);
    }
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

          {/* email */}
          {!emailSent && (
            <button
              onClick={() => setEmailSent(true)}
              style={{
             marginTop: "15px",
                padding: "10px",
                width: "100%",
                borderRadius: "6px",
                backgroundColor: "var(--accent-primary)",
                color: "white",
                border: "none",
                cursor: "pointer"
              }}
            >
              Save Results
            </button>
          )}

          {emailSent && (
            <div className="email-section" style={{ marginTop: "15px" }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  marginRight: '8px',
                  width: '250px'
                }}
              />

              <button 
                onClick={() => sendEmail(topTrait)}
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  width: "100%",
                  borderRadius: "6px",
                  backgroundColor: "var(--accent-primary)",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Send Results
              </button>
            </div>
          )}
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
            <>
            <QuizQuestion
              question={currentQuestion}
              options={options}
              onAnswer={handleAnswer}
            />
            {currentIndex > 0 && (
              <button className="back-button" onClick={handleBack}>
                &larr; Back
              </button>
            )}  
          </>
          )}
        </div>
      </div>
    </div>
  );
}