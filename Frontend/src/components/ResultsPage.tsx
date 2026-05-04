import { useState, useEffect, useRef } from "react";
import "./ResultsPage.css";
import MajorCard from "./MajorCard";
import { getCareers, type Career } from "../utils/api";
import { getMLCareers, type MLCareer } from "../utils/mlCareers";
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
  onContinue: () => void;
  canGoBack: boolean;
  sendEmail: (email: string, topTraits: string[], careers: { title: string; description: string; code: string }[]) => Promise<void>;
}

// unified career type that works for both sources
interface DisplayCareer {
  id: string;
  title: string;
  description: string;
  source: 'db' | 'ml';
}

const DISPLAY_COUNT = 10;

function mergeAlternating(dbCareers: Career[], mlCareers: MLCareer[]): DisplayCareer[] {
  const merged: DisplayCareer[] = [];
  const usedTitles = new Set<string>();
  let dbIndex = 0;
  let mlIndex = 0;
  let count = 0;

  while (count < DISPLAY_COUNT) {
    // even indices (0, 2, 4...) → db career
    // odd indices (1, 3, 5...) → ml career
    if (count % 2 === 0) {
      while (dbIndex < dbCareers.length) {
        const career = dbCareers[dbIndex++];
        if (!usedTitles.has(career.title)) {
          usedTitles.add(career.title);
          merged.push({
            id: career.onetsoc_code,
            title: career.title,
            description: career.description,
            source: 'db'
          });
          break;
        }
      }
    } else {
      while (mlIndex < mlCareers.length) {
        const career = mlCareers[mlIndex++];
        if (!usedTitles.has(career.Title)) {
          usedTitles.add(career.Title);
          merged.push({
            id: career['O*NET-SOC Code'],
            title: career.Title,
            description: career['Career Category'],
            source: 'ml'
          });
          break;
        }
      }
    }
    count++;
  }

  return merged;
}

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
  const isFromCheckpoint = questionCount < 48;

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
  const [allDbCareers, setAllDbCareers] = useState<Career[]>([]);
  const [allMlCareers, setAllMlCareers] = useState<MLCareer[]>([]);
  const [lastRemoved, setLastRemoved] = useState<{
    career: DisplayCareer;
    index: number;
    hadReplacement: boolean;
    replacementId: string | null;
  } | null>(null);

  const usedIds = useRef<Set<string>>(new Set());
  const dbIndexRef = useRef(0);
  const mlIndexRef = useRef(0);

  useEffect(() => {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('sessionId', sessionId);
    }

    // load DB careers
    getCareers(scores, sessionId)
      .then((dbData) => {
        console.log('DB careers loaded:', dbData.length);
        setAllDbCareers(dbData);

        // load ML careers separately after DB succeeds
        getMLCareers(scores)
          .then((mlData) => {
            console.log('ML careers loaded:', mlData.length);
            setAllMlCareers(mlData);

            const initial = mergeAlternating(dbData, mlData);
            initial.forEach(c => usedIds.current.add(c.id));
            dbIndexRef.current = Math.ceil(DISPLAY_COUNT / 2);
            mlIndexRef.current = Math.floor(DISPLAY_COUNT / 2);
            setVisibleCareers(initial);
          })
          .catch((err) => {
            console.error('ML careers error full:', err);
            console.error('ML error message:', err.message);
            console.error('ML error stack:', err.stack);
            console.error('ML error type:', typeof err);
            // fall back to just DB careers if ML fails
            const initial = dbData.slice(0, DISPLAY_COUNT).map(c => ({
              id: c.onetsoc_code,
              title: c.title,
              description: c.description,
              source: 'db' as const
            }));
            initial.forEach(c => usedIds.current.add(c.id));
            setVisibleCareers(initial);
          });
      })
      .catch((err) => {
        console.error('DB careers error:', err);
        setCareersError(err.message);
      })
      .finally(() => {
        setCareersLoading(false);
      });
  }, [hollandCode]);

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

  const getNextCareer = (removedIndex: number): DisplayCareer | null => {
    // alternate replacement based on whether removed was db or ml
    const removedSource = visibleCareers[removedIndex]?.source;
    
    if (removedSource === 'db') {
      while (dbIndexRef.current < allDbCareers.length) {
        const career = allDbCareers[dbIndexRef.current++];
        if (!usedIds.current.has(career.onetsoc_code)) {
          return {
            id: career.onetsoc_code,
            title: career.title,
            description: career.description,
            source: 'db'
          };
        }
      }
    } else {
      while (mlIndexRef.current < allMlCareers.length) {
        const career = allMlCareers[mlIndexRef.current++];
        if (!usedIds.current.has(career['O*NET-SOC Code'])) {
          return {
            id: career['O*NET-SOC Code'],
            title: career.Title,
            description: career['Career Category'],
            source: 'ml'
          };
        }
      }
    }
    return null;
  };

  const removeCareer = (index: number) => {
    setVisibleCareers((prev) => {
      const removed = prev[index];
      const nextCareer = getNextCareer(index);

      if (nextCareer) {
        usedIds.current.add(nextCareer.id);
      }

      if (selectedCareer?.id === removed.id) {
        setSelectedCareer(null);
      }

      setLastRemoved({
        career: removed,
        index,
        hadReplacement: !!nextCareer,
        replacementId: nextCareer?.id ?? null
      });

      const updated = prev.filter((_, i) => i !== index);
      return nextCareer ? [...updated, nextCareer] : updated;
    });
  };

  const undoRemove = () => {
    if (!lastRemoved) return;

    if (lastRemoved.replacementId) {
      usedIds.current.delete(lastRemoved.replacementId);
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
                  <p className="career-info-code">{selectedCareer.id}</p>
                </li>
                <li>
                  <strong>Source</strong>
                  <p className="career-info-code">{selectedCareer.source === 'ml' ? '🤖 AI Recommended' : '📊 Database Match'}</p>
                </li>
              </ul>
            ) : (
              <p className="career-info-empty">
                Select a career to see more information.
              </p>
            )}
          </div>

          {isFromCheckpoint && (
            <div className="continue-wrapper">
              <button
                className="email-button"
                onClick={onContinue}
                aria-label="Continue the quiz"
              >
                Continue Quiz
              </button>
            </div>
          )}

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
                    key={career.id}
                    title={career.title}
                    description={career.description}
                    onClick={() => setSelectedCareer(career)}
                    onRemove={() => removeCareer(i)}
                    isAI={career.source === 'ml'}
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
                aria-label="Save your quiz results to email"
              >
                Save results
              </button>
            ) : (
              <div 
                className="email-section"
                role="form"
                aria-label="Enter email to receive your results">

                  <button
                  className="email-button"
                  onClick={handleEmail}
                  aria-label="Send your quiz results to your email"
                >
                  Send Results
                </button>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="email-input"
                  aria-label="Email address"
                  aria-required="true"
                />
                
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