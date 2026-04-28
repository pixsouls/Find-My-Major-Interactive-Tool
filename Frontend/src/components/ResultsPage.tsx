import { useState, useEffect, useRef } from "react";
import "./ResultsPage.css";
import MajorCard from "./MajorCard";
import { getCareers, type Career } from "../utils/api";
import "./Email.css";

type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";

interface ResultsPageProps {
  scores: Record<RiasecType, number>;
  questionCount: number;
  onRestart: () => void;
  onBack: () => void;
  onContinue: () => void;
  canGoBack: boolean;
  email: string;
  setEmail: (email: string) => void;
  emailSent: boolean;
  setEmailSent: (value: boolean) => void;
  sendEmail: (topTrait: string) => void;
}

const DISPLAY_COUNT = 10;

export default function ResultsPage({
  scores,
  questionCount,
  onRestart,
  onBack,
  onContinue,
  canGoBack,
  email,
  setEmail,
  emailSent,
  setEmailSent,
  sendEmail
}: ResultsPageProps) {

  const sortedTraits = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]) as [RiasecType, number][];

  const topTraits = sortedTraits.slice(0, 3);
  const topTrait = topTraits[0][0];
  const hollandCode = topTraits.map(([t]) => t).join("");

  const traitLabels: Record<RiasecType, string> = {
    R: "Realistic",
    I: "Investigative",
    A: "Artistic",
    S: "Social",
    E: "Enterprising",
    C: "Conventional",
  };

  const [allCareers, setAllCareers] = useState<Career[]>([]);
  const [visibleCareers, setVisibleCareers] = useState<Career[]>([]);
  const [careersLoading, setCareersLoading] = useState(true);
  const [careersError, setCareersError] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{
    career: Career;
    index: number;
    hadReplacement: boolean;
    replacementCode: string | null;
  } | null>(null);

  const usedCodes = useRef<Set<string>>(new Set());

  useEffect(() => {
    getCareers(scores)
      .then((data) => {
        setAllCareers(data);
        const initial = data.slice(0, DISPLAY_COUNT);
        initial.forEach(c => usedCodes.current.add(c.onetsoc_code));
        setVisibleCareers(initial);
      })
      .catch((err) => {
        setCareersError(err.message);
      })
      .finally(() => {
        setCareersLoading(false);
      });
  }, []);

  const removeCareer = (index: number) => {
    setVisibleCareers((prev) => {
      const removed = prev[index];

      const nextCareer = allCareers.find(
        (c) => !usedCodes.current.has(c.onetsoc_code)
      );

      if (nextCareer) {
        usedCodes.current.add(nextCareer.onetsoc_code);
      }

      if (selectedCareer?.onetsoc_code === removed.onetsoc_code) {
        setSelectedCareer(null);
      }

      setLastRemoved({
        career: removed,
        index,
        hadReplacement: !!nextCareer,
        replacementCode: nextCareer?.onetsoc_code ?? null
      });

      const updated = prev.filter((_, i) => i !== index);
      return nextCareer ? [...updated, nextCareer] : updated;
    });
  };

  const undoRemove = () => {
    if (!lastRemoved) return;

    if (lastRemoved.replacementCode) {
      usedCodes.current.delete(lastRemoved.replacementCode);
    }

    setVisibleCareers((prev) => {
      const updated = lastRemoved.hadReplacement ? prev.slice(0, -1) : [...prev];
      updated.splice(lastRemoved.index, 0, lastRemoved.career);
      return updated;
    });

    setLastRemoved(null);
  };

  return (
    <div className="results-page">

      <div className="results-header">
        <button
          className="results-back-btn"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Go back to the previous step"
        >
          Back
        </button>

        <button
          className="results-restart-btn"
          onClick={onRestart}
          aria-label="Restart the quiz"
        >
          ↺
        </button>
      </div>

      <div className="results-hero">
        <div>
          <p className="small-text highlight">Assessment Complete</p>
          <h1 className="headline">Your Career Profile</h1>
          <p className="subtext">Based on {questionCount} questions</p>
        </div>

        <div className="holland-reveal-card">
          <p className="label">Your Holland Code</p>
          <h2 className="holland-code">{hollandCode}</h2>
          <p className="primary">
            {traitLabels[topTrait]} ({topTrait})
          </p>
        </div>
      </div>

      <div className="dashboard-grid">

        <div className="left-panel">

          <div className="results-card">
            <h2>Your Top Traits</h2>
            {topTraits.map(([trait, score]) => (
              <div key={trait} className="trait-row">
                <span>{traitLabels[trait]}</span>
                <div className="bar">
                  <div
                    className="fill"
                    style={{ width: `${(score / 20) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="results-card">
            <h2>Career Information</h2>
            {selectedCareer ? (
              <ul className="career-info-list">
                <li>
                  <strong>Title</strong>
                  <p className="career-info-title">{selectedCareer.title}</p>
                </li>
                <li>
                  <strong>Description</strong>
                  <p className="career-info-description">{selectedCareer.description}</p>
                </li>
                <li>
                  <strong>ONET Code</strong>
                  <p className="career-info-code">{selectedCareer.onetsoc_code}</p>
                </li>
              </ul>
            ) : (
              <p className="career-info-empty">
                Select a career to see more information.
              </p>
            )}
          </div>

          {/* EMAIL FEATURE instead of Continue Quiz button */}
          <div
            className="email-save-card"
            role="region"
            aria-label="Save your quiz results by email"
          >
            {!emailSent ? (
              <button
                className="email-button"
                onClick={() => setEmailSent(true)}
                aria-label="Save your results by entering your email"
              >
                Save Results
              </button>
            ) : (
              <div
                className="email-section"
                role="form"
                aria-label="Enter email to receive your results"
              >
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
                  onClick={() =>
                    sendEmail(
                      Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
                    )
                  }
                  aria-label="Send your quiz results to your email"
                >
                  Send Results
                </button>
              </div>
            )}
          </div>

        </div>

        <div className="right-panel">
          <div className="results-card">
            <h2>Recommended Careers</h2>

            {careersLoading && (
              <p className="careers-status">Loading careers...</p>
            )}

            {careersError && (
              <p className="careers-status careers-error">
                Failed to load careers: {careersError}
              </p>
            )}

            {!careersLoading && !careersError && visibleCareers.length === 0 && (
              <p className="careers-status">No careers found.</p>
            )}

            {!careersLoading && !careersError && visibleCareers.length > 0 && (
              <div className="majors-grid">
                {visibleCareers.map((career, i) => (
                  <MajorCard
                    key={career.onetsoc_code}
                    title={career.title}
                    description={career.description}
                    onClick={() => setSelectedCareer(career)}
                    onRemove={() => removeCareer(i)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lastRemoved && (
        <div className="undo-toast">
          <div className="undo-text">
            {lastRemoved.career.title} removed
          </div>
          <button onClick={undoRemove} className="undo-btn">
            Undo
          </button>
        </div>
      )}

    </div>
  );
}