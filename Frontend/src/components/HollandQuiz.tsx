import { useState } from 'react';
import { questions, options, type RiasecType } from '../data/types';
import ExploreMajors from './ExploreMajors';
import QuizCheckpoint from './QuizCheckpoint';
import { QuizQuestion } from './QuizQuestion';
import { selectNextQuestion } from '../algorithms/questionSelector';
import './HollandQuiz.css';
import './Email.css';

export default function HollandQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(questions[0]); // Start with first question
  const [askedQuestionIds, setAskedQuestionIds] = useState<number[]>([]);
  const [scores, setScores] = useState<Record<RiasecType, number>>({
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0
  });
  const [showResults, setShowResults] = useState(false);
  const [isCheckpoint, setIsCheckpoint] = useState(false);
  const [showExploreMajors, setShowExploreMajors] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  // Email state
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  const questionsUntilCheckpoint = 12;
  
  // For checkpoint screen, show previous checkpoint numbers (e.g., 6/6)
  const displayIndex = isCheckpoint ? questionCount : questionCount + 1;
  const displayCheckpoint = isCheckpoint 
    ? Math.floor(questionCount / questionsUntilCheckpoint) * questionsUntilCheckpoint
    : Math.ceil((questionCount + 1) / questionsUntilCheckpoint) * questionsUntilCheckpoint;
  
  // Progress bar should show completed questions out of checkpoint
  const progressPercentage = (questionCount / displayCheckpoint) * 100;

  const handleAnswer = (weight: number) => {
    const weightMap: Record<number, number> = {
      1: -2,  // Strongly Disagree
      2: -1,  // Disagree
      3: 0,   // Neutral
      4: 1,   // Agree
      5: 2    // Strongly Agree
    };
    // Update scores
    const newScores = {
      ...scores,
      [currentQuestion.type]: scores[currentQuestion.type] + weightMap[weight]
    };
    setScores(newScores);

    // DEBUG: Print formatted scores
    const sortedScores = Object.entries(newScores)
      .sort((a, b) => b[1] - a[1])
      .map(([type, score]) => `${type}: ${score}`)
      .join(', ');
    console.log(`📊 Scores (Highest→Lowest): ${sortedScores}`);

    // Mark this question as asked
    const newAskedIds = [...askedQuestionIds, currentQuestion.id];
    setAskedQuestionIds(newAskedIds);

    // Increment question count
    const newCount = questionCount + 1;
    setQuestionCount(newCount);

    // Check if we hit a checkpoint (every 6 questions)
    if (newCount % questionsUntilCheckpoint === 0) {
      setIsCheckpoint(true);
      return;
    }

    // Get next question using algorithm
    const nextQuestion = selectNextQuestion(questions, newAskedIds, newScores);
    
    if (!nextQuestion) {
      // No more questions available
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

  // email 
  const sendEmail = async (topTrait: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/send-email', {
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
    const topTrait = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    
    return (
      <div className="holland-quiz-container results-view">
        {/* Progress Header */}
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
          <p>Primary Archetype: <strong style={{ color: 'var(--msu-red)' }}>{topTrait}</strong></p>

          {/* email */}
          {!emailSent && (
            <button className="save-results-button" onClick={() => setEmailSent(true)}>
              Save Results
            </button>
          )}

          {emailSent && (
            <div className="email-section">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="email-input"
              />

              <button className="email-button"
                onClick={() => sendEmail(topTrait)}>
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
          {showExploreMajors ? (
            <ExploreMajors scores={scores} onBack={handleBackFromExplore} />
          ) : isCheckpoint ? (
            <>
            <QuizCheckpoint
              scores={scores}
              onContinue={handleContinue}
              onExplore={handleExploreMajors}
            />

            {/* email button for every checkpoint */}
            {!emailSent && (
              <button className="save-results-button"
                onClick={() => setEmailSent(true)}>
                Save Results
              </button>
            )}

            {emailSent && (
              <div className="email-section">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="email-input"/>
                <button className="email-button"
                  onClick={() => sendEmail(Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0])}>
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
    </div>
  );
}