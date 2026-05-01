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

  const sendEmail = async (email: string, topTraits: string[], careers: { title: string; description: string; code: string }[]) => {
    try {
      const careerCodes = careers.map((career) => career.code);

      const majorsResponse = await fetch("http://localhost:4000/api/recommended-majors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ careerCodes }),
      });

      if (!majorsResponse.ok) {
        throw new Error("Failed to load majors for email");
      }

      const majors = await majorsResponse.json();

      const majorsByCareer: Record<string, string[]> = {};

      majors.forEach((major: any) => {
        if (!majorsByCareer[major.onetsoc_code]) {
          majorsByCareer[major.onetsoc_code] = [];
        }

        if (!majorsByCareer[major.onetsoc_code].includes(major.major_name)) {
          majorsByCareer[major.onetsoc_code].push(major.major_name);
        }
      });

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
          <h1 style="color: #2d3748;">Find My Major Results</h1>

          <h2>Your Top Traits</h2>
          <ol>
            ${topTraits.map((trait) => `<li>${trait}</li>`).join("")}
          </ol>

          <h2>Recommended Careers</h2>

          ${careers
            .slice(0, 10)
            .map((career, index) => {
              const relatedMajors = majorsByCareer[career.code] || [];

              return `
                <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
                  <h3>${index + 1}. ${career.title}</h3>
                  <p><strong>ONET Code:</strong> ${career.code}</p>
                  <p>${career.description}</p>

                  <h4>Related Majors</h4>
                  ${
                    relatedMajors.length > 0
                      ? `<ul>${relatedMajors
                          .slice(0, 5)
                          .map((major) => `<li>${major}</li>`)
                          .join("")}</ul>`
                      : `<p>No related majors found.</p>`
                  }
                </div>
              `;
            })
            .join("")}
        </div>
      `;

      const text = `
Find My Major Results

Your Top Traits
${topTraits.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Recommended Careers
${careers
  .slice(0, 10)
  .map((career, i) => {
    const relatedMajors = majorsByCareer[career.code] || [];

    return `
${i + 1}. ${career.title}
ONET Code: ${career.code}
${career.description}

Related Majors:
${
  relatedMajors.length > 0
    ? relatedMajors.slice(0, 10).map((m) => `- ${m}`).join("\n")
    : "- No related majors found"
}
`;
  })
  .join("\n")}
`;

      const response = await fetch("http://localhost:4000/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: "Find My Major Results",
          text,
          html,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      alert("Email sent successfully!");
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Email failed. Check console.");
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