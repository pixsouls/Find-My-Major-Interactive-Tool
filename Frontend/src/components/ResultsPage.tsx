import { useState, useEffect, useRef } from "react";
import "./ResultsPage.css";
import MajorCard from "./MajorCard";
import { getMLCareers, type MLCareer } from "../utils/mlCareers";
import "./Email.css";

type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";

type CareerSource = "ML" | "Database";

interface ResultsPageProps {
  scores: Record<RiasecType, number>;
  questionCount: number;
  onRestart: () => void;
  onBack: () => void;
  onContinue: () => void;
  canGoBack: boolean;
  sendEmail: (email: string, topTraits: string[], careers: { title: string; description: string; code: string }[]) => Promise<void>;
}

type DisplayCareer = {
  id: string;
  title: string;
  description: string;
  category?: string;
  matchScore?: number;
  source: CareerSource;
};

type RecommendedMajor = {
  onetsoc_code: string;
  career?: string;
  major_name: string;
  match_strength?: number;
};

const DISPLAY_COUNT = 10;

export default function ResultsPage({
  scores,
  questionCount,
  onRestart,
  onBack,
  onContinue,
  canGoBack,
  sendEmail,
}: ResultsPageProps) {

  const sortedTraits = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]) as [RiasecType, number][];

  const topTraits = sortedTraits.slice(0, 3);
  const topTrait = topTraits[0][0];
  const hollandCode = topTraits.map(([trait]) => trait).join("");
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
  const [email, setEmail] = useState("");

  const [allCareers, setAllCareers] = useState<DisplayCareer[]>([]);
  const [visibleCareers, setVisibleCareers] = useState<DisplayCareer[]>([]);
  const [careersLoading, setCareersLoading] = useState(true);
  const [careersError, setCareersError] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<DisplayCareer | null>(null);
  const [recommendedMajors, setRecommendedMajors] = useState<RecommendedMajor[]>([]);
  const [majorsLoading, setMajorsLoading] = useState(false);
  const [majorsError, setMajorsError] = useState<string | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{
    career: DisplayCareer;
    index: number;
    replacementId: string | null;
  } | null>(null);

  const usedIds = useRef<Set<string>>(new Set());
  const careerIndexRef = useRef(DISPLAY_COUNT);

  function normalizeCode(code: string): string {
    if (!code) return "";
    return code.includes(".") ? code : `${code}.00`;
  }

  function convertMLCareer(career: MLCareer): DisplayCareer {
    return {
      id: normalizeCode(career["O*NET-SOC Code"]),
      title: career.Title,
      description: career["Career Category"],
      category: career["Career Category"],
      matchScore: career.Match_Score,
      source: "ML",
    };
  }

  function convertDatabaseCareer(career: any): DisplayCareer {
    return {
      id: normalizeCode(career.onetsoc_code ?? career["O*NET-SOC Code"] ?? ""),
      title: career.title ?? career.Title ?? "",
      description: career.description ?? career.career_category ?? "",
      category: career.career_category ?? career.category ?? "",
      source: "Database",
    };
  }

  function combineCareers(
    mlCareers: DisplayCareer[],
    databaseCareers: DisplayCareer[]
  ): DisplayCareer[] {
    const combined = [...mlCareers, ...databaseCareers];
    const uniqueByCode = new Map<string, DisplayCareer>();

    for (const career of combined) {
      if (!career.id || !career.title) continue;

      if (!uniqueByCode.has(career.id)) {
        uniqueByCode.set(career.id, career);
      }
    }

    return Array.from(uniqueByCode.values());
  }

  useEffect(() => {
    async function loadCareers() {
      setCareersLoading(true);
      setCareersError(null);
      setSelectedCareer(null);
      setRecommendedMajors([]);

      try {
        const mlRaw = await getMLCareers(scores);

        const invalidML = mlRaw.filter(
          (career) =>
            !career["O*NET-SOC Code"] ||
            career["O*NET-SOC Code"].trim() === ""
        );

        console.log("ML careers missing O*NET codes:", invalidML.length);
        console.log(invalidML);

        const mlCareers = mlRaw.map(convertMLCareer);

        let databaseCareers: DisplayCareer[] = [];

        try {
          const dbResponse = await fetch(
            `http://localhost:4000/api/careers?hollandCode=${hollandCode}`
          );

          if (dbResponse.ok) {
            const dbRaw = await dbResponse.json();

            const invalidDB = dbRaw.filter(
              (career: any) =>
                !career.onetsoc_code || career.onetsoc_code.trim() === ""
            );

            console.log("DB careers missing O*NET codes:", invalidDB.length);
            console.log(invalidDB);

            databaseCareers = dbRaw.map(convertDatabaseCareer);
          } else {
            console.warn("Database careers did not load.");
          }
        } catch (dbErr) {
          console.warn("Database careers failed. Continuing with ML only.", dbErr);
        }

        const combined = combineCareers(mlCareers, databaseCareers);

        setAllCareers(combined);
        setVisibleCareers(combined.slice(0, DISPLAY_COUNT));

        usedIds.current = new Set(
          combined.slice(0, DISPLAY_COUNT).map((career) => career.id)
        );

        careerIndexRef.current = DISPLAY_COUNT;
      } catch (err: any) {
        console.error("Careers error:", err);
        setCareersError(err.message || "Failed to load careers");
      } finally {
        setCareersLoading(false);
      }
    }

    loadCareers();
  }, [hollandCode, scores]);

  useEffect(() => {
    if (!selectedCareer) {
      setRecommendedMajors([]);
      setMajorsError(null);
      return;
    }

    const careerToLoad = selectedCareer;

    async function loadMajors() {
      setMajorsLoading(true);
      setMajorsError(null);

      try {
        console.log("Selected career:", careerToLoad);

        const response = await fetch(
          "http://localhost:4000/api/majors-by-careers",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              onetCodes: [careerToLoad.id],
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load recommended majors");
        }

        const data = await response.json();
        setRecommendedMajors(data);
      } catch (err: any) {
        console.error("Majors error:", err);
        setMajorsError(err.message || "Failed to load majors");
      } finally {
        setMajorsLoading(false);
      }
    }

    loadMajors();
  }, [selectedCareer]);

  function getNextCareer(): DisplayCareer | null {
    while (careerIndexRef.current < allCareers.length) {
      const nextCareer = allCareers[careerIndexRef.current++];

      if (nextCareer.id && !usedIds.current.has(nextCareer.id)) {
        return nextCareer;
      }
    }

    return null;
  }

  function removeCareer(index: number) {
    setVisibleCareers((prev) => {
      const removed = prev[index];
      const replacement = getNextCareer();

      if (replacement) {
        usedIds.current.add(replacement.id);
      }

      if (selectedCareer?.id === removed.id) {
        setSelectedCareer(null);
      }

      setLastRemoved({
        career: removed,
        index,
        replacementId: replacement?.id ?? null,
      });

      const updated = prev.filter((_, i) => i !== index);
      return replacement ? [...updated, replacement] : updated;
    });
  }

  function undoRemove() {
    if (!lastRemoved) return;

    if (lastRemoved.replacementId) {
      usedIds.current.delete(lastRemoved.replacementId);
    }

    setVisibleCareers((prev) => {
      const updated = lastRemoved.replacementId ? prev.slice(0, -1) : [...prev];
      updated.splice(lastRemoved.index, 0, lastRemoved.career);
      return updated;
    });

    setLastRemoved(null);
  }

  //email handler
  async function handleEmail() {
    if (!email) {
      alert("Please enter a valid email address.");
      return;
    }

    const traitList = topTraits.map(
      ([trait]) => `${traitLabels[trait]} (${trait})`
    );

    const careerData = visibleCareers.slice(0, 10).map((career) => ({
      title: career.title,
      description: career.description,
      code: career.id,
    }));

    try {
      await sendEmail(email, traitList, careerData);
      setEmail("");
      setEmailSent(false);
      //alert("Email sent successfully!");
    } catch (err) {
      console.error("EMAIL FAILED:", err);
      alert("Email failed. Check console.");
    }
  }

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
        aria-label="Restart the quiz">
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
                  <strong>O*NET Code</strong>
                  <p className="career-info-code">{selectedCareer.id}</p>
                </li>
                <li>
                  <strong>Source</strong>
                  <p className="career-info-code">{selectedCareer.source}</p>
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
              <p className="careers-status">
                Loading career recommendations...
              </p>
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
                {visibleCareers.map((career, index) => (
                  <MajorCard
                    key={career.id}
                    title={career.title}
                    description={career.description}
                    onClick={() => setSelectedCareer(career)}
                    onRemove={() => removeCareer(index)}
                    isAI={career.source === "ML"}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="results-card">
            <h2>Recommended MSU Denver Majors</h2>

            {majorsLoading && (
              <p className="careers-status">Loading majors...</p>
            )}

            {majorsError && (
              <p className="careers-status careers-error">
                Failed to load majors: {majorsError}
              </p>
            )}

            {!majorsLoading && !majorsError && !selectedCareer && (
              <p className="careers-status">
                Select a career to see related MSU Denver majors.
              </p>
            )}

            {!majorsLoading && !majorsError &&selectedCareer && recommendedMajors.length === 0 && (
                <p className="careers-status">
                  {selectedCareer
                    ? "No strong MSU major match was found for this career."
                    : "Select a career to see related MSU Denver majors."}
                </p>
              )}

            {!majorsLoading && !majorsError && recommendedMajors.length > 0 && (
                <ul style={{ paddingLeft: "20px" }}>
                  {recommendedMajors.map((major, index) => (
                    <li key={`${major.major_name}-${index}`}>
                      {major.major_name}
                    </li>
                  ))}
                </ul>
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
              <div className="email-section"
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
                onClick={handleEmail}
                aria-label="Send your quiz results to your email"
                >
                  Send Results
                </button>
                
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