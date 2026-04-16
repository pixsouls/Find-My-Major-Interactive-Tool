import { useState } from "react";
import "./ResultsPage.css";
import MajorCard from "./MajorCard";

type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";

interface ResultsPageProps {
  scores: Record<RiasecType, number>;
  questionCount: number;
}

type Major = { title: string; description: string };

export default function ResultsPage({
  scores,
  questionCount,
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

  const traitToMajors: Record<RiasecType, Major[]> = {
    R: [
      { title: "Engineering", description: "Build and design real-world systems." },
      { title: "Construction", description: "Hands-on physical building work." },
    ],
    I: [
      { title: "Computer Science", description: "AI, programming, and systems thinking." },
      { title: "Biology", description: "Study life and living systems." },
    ],
    A: [
      { title: "Graphic Design", description: "Visual storytelling and digital art." },
      { title: "Music", description: "Creative expression through sound." },
    ],
    S: [
      { title: "Nursing", description: "Care for and help others directly." },
      { title: "Psychology", description: "Understand human behavior and mind." },
    ],
    E: [
      { title: "Business", description: "Lead, manage, and build organizations." },
      { title: "Marketing", description: "Influence audiences and markets." },
    ],
    C: [
      { title: "Accounting", description: "Structure, numbers, and financial systems." },
      { title: "Information Systems", description: "Organize tech + business data." },
    ],
  };

  const allMajors = topTraits.flatMap(([t]) => traitToMajors[t]);

  const [visibleMajors, setVisibleMajors] = useState<Major[]>(allMajors);

  const [lastRemoved, setLastRemoved] = useState<{
    major: Major;
    index: number;
  } | null>(null);

  const removeMajor = (index: number) => {
    setVisibleMajors((prev) => {
      const removed = prev[index];

      setLastRemoved({
        major: removed,
        index,
      });

      return prev.filter((_, i) => i !== index);
    });
  };

  const undoRemove = () => {
    if (!lastRemoved) return;

    setVisibleMajors((prev) => {
      const updated = [...prev];
      updated.splice(lastRemoved.index, 0, lastRemoved.major);
      return updated;
    });

    setLastRemoved(null);
  };

  return (
    <div className="results-page">

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
        </div>

        {/* RIGHT */}
        <div className="right-panel">
          <div className="results-card">
            <h2>Recommended Majors</h2>

            <div className="majors-grid">
              {visibleMajors.map((m, i) => (
                <MajorCard
                  key={`${m.title}-${i}`}
                  title={m.title}
                  description={m.description}
                  onClick={() => console.log(m.title)}
                  onRemove={() => removeMajor(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

{/* UNDO TOAST */}
{lastRemoved && (
  <div className="undo-toast">
    <div className="undo-text">
      {lastRemoved.major.title} removed
    </div>

    <button onClick={undoRemove} className="undo-btn">
      Undo
    </button>
  </div>
)}

    </div>
  );
}