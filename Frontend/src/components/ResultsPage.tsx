import { useState, useEffect, useRef } from "react";
import "./ResultsPage.css";
import MajorCard from "./MajorCard";
import { getCareers, type Career } from "../utils/api";
import "./Email.css";

type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";

type RecommendedMajor = {
  onetsoc_code: string;
  career: string;
  major_name: string;
  match_strength: number;
};

interface ResultsPageProps {
  scores: Record<RiasecType, number>;
  questionCount: number;
  onRestart: () => void;
  onBack: () => void;
  onContinue: () => void;  // make sure this is here
  canGoBack: boolean;
  sendEmail: (email: string, topTraits: string[], careers: { title: string; description: string; code: string }[]) => Promise<void>;
}

const DISPLAY_COUNT = 10;

export default function ResultsPage({
  scores,
  questionCount,
  onRestart,
  onBack,
  onContinue,
  canGoBack,
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

  //email
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  const [allCareers, setAllCareers] = useState<Career[]>([]);
  const [visibleCareers, setVisibleCareers] = useState<Career[]>([]);
  const [careersLoading, setCareersLoading] = useState(true);
  const [careersError, setCareersError] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [recommendedMajors, setRecommendedMajors] = useState<RecommendedMajor[]>([]);
  const [majorsLoading, setMajorsLoading] = useState(false);
  const [majorsError, setMajorsError] = useState<string | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{
    career: Career;
    index: number;
    hadReplacement: boolean;
    replacementCode: string | null;
  } | null>(null);

  // tracks every career that has ever been visible, so they never recycle
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

  useEffect(() => {
  if (!selectedCareer) {
    setRecommendedMajors([]);
    return;
  }

  const career = selectedCareer;

  async function fetchRecommendedMajors() {
    setMajorsLoading(true);
    setMajorsError(null);

    try {
      const careerCodes = [career.onetsoc_code];

      const response = await fetch("http://localhost:4000/api/recommended-majors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ careerCodes }),
      });

      if (!response.ok) {
        throw new Error("Failed to load recommended majors");
      }

      const data = await response.json();
      setRecommendedMajors(data);
    } catch (err: any) {
      setMajorsError(err.message);
    } finally {
      setMajorsLoading(false);
    }
  }

  fetchRecommendedMajors();
}, [selectedCareer]);

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

    // remove the replacement from usedCodes so it can appear again later
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

  //email handler
  const handleEmail = async () => {
    if (!email){
      alert('Please enter a valid email address.');
      return;
    }
      //del
    if (!sendEmail) {
      console.error("sendEmail function is not provided");
      return;
    }

    const traitList = topTraits.map(
      ([t]) => `${traitLabels[t]} (${t})`
    );

    const careerData = visibleCareers
    .filter(c => c.title && c.description && c.onetsoc_code)
    .slice(0, 10)
    .map(c => ({
      title: c.title,
      description: c.description,
      code: c.onetsoc_code
    }));

    console.log("sending email with data:", email, traitList, careerData);

    try {
    await sendEmail(email, traitList, careerData);

    setEmail("");
    setEmailSent(false);

    alert("Email sent successfully!");
    } catch (err) {
      console.error("EMAIL FAILED:", err);
      alert("Email failed. Check console.");
    }
  };

  const majorsByCareer: Record<string, string[]> = {};

  recommendedMajors.forEach((item) => {
    if (!majorsByCareer[item.career]) {
      majorsByCareer[item.career] = [];
    }

    majorsByCareer[item.career].push(item.major_name);
  });

  return (
    <div className="results-page">

      {/* HEADER CONTROLS */}
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

      {/* HERO */}
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

      {/* DASHBOARD */}
      <div className="dashboard-grid">

        {/* LEFT */}
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
              <p className="career-info-empty">Select a career to see more information.</p>
            )}
          </div>

          <button
            className="results-continue-btn"
            onClick={onContinue}
            aria-label="Continue the quiz from where you left off"
          >
            Continue Quiz
          </button>
        </div>

        {/* RIGHT */}
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
                    key={`${career.onetsoc_code}`}
                    title={career.title}
                    description={career.description}
                    onClick={() => setSelectedCareer(career)}
                    onRemove={() => removeCareer(i)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="results-card">
            <h2>Recommended Majors</h2>

            {majorsLoading && (
              <p className="careers-status">Loading majors...</p>
            )}

            {majorsError && (
              <p className="careers-status careers-error">
                Failed to load majors: {majorsError}
              </p>
            )}

            {!majorsLoading && !majorsError && recommendedMajors.length === 0 && (
              <p className="careers-status">
                Select a career to see related majors.
              </p>
            )}

            {!majorsLoading && !majorsError && recommendedMajors.length > 0 && (
              <div>
                
                {Object.entries(majorsByCareer).map(([career, majors]) => (
                  <div key={career}>
                    <span>{career}</span>
                    <ul style={{ paddingLeft: "20px" }}>
                      {majors.map((major, index) => (
                        <li key={index}>{major}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* EMAIL */}
          <div className="email-container">
            {!emailSent ? (
              <button
                className="email-button"
                onClick={() => setEmailSent(true)}
              >
                Save results
              </button>
            ) : (
              <div className="email-section">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="email-input"
                />
                <button
                  className="email-button"
                  onClick={handleEmail}
                >
                  Send Results
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* UNDO TOAST */}
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