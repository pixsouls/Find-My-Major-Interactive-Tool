import { useState } from 'react';
import './CareerInfoPanel.css';
import CareerDetailModal from './CareerDetailModal';
import MajorDetailModal from './MajorDetailModal';
import type { CareerMajor } from '../utils/api';

interface DisplayCareer {
  id: string;
  title: string;
  description: string;
  source: 'db' | 'ml';
}

export type MajorsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface CareerInfoPanelProps {
  selectedCareer: DisplayCareer | null;
  careerMajors: CareerMajor[];
  majorsStatus: MajorsStatus;
}

const PLACEHOLDER = 'Select a career to see more information.';

export default function CareerInfoPanel({
  selectedCareer,
  careerMajors,
  majorsStatus,
}: CareerInfoPanelProps) {
  // Both dialogs are tagged with the career they were opened for and derived
  // rather than reset in an effect: selecting a different career makes the tag
  // stop matching, which closes them without a cascading re-render.
  const [modalFor, setModalFor] = useState<string | null>(null);
  const [majorFor, setMajorFor] = useState<{ careerId: string; major: CareerMajor } | null>(null);

  const showModal = !!selectedCareer && modalFor === selectedCareer.id;
  const viewedMajor =
    selectedCareer && majorFor?.careerId === selectedCareer.id ? majorFor.major : null;

  // Every row renders in every state. The panel used to collapse to a single
  // italic line with nothing selected and then expand to four populated rows on
  // click, which grew the whole page; reserved heights in the CSS keep the two
  // states the same size.
  const renderMajors = () => {
    if (!selectedCareer) {
      return <p className="career-info-empty">{PLACEHOLDER}</p>;
    }
    if (majorsStatus === 'loading') {
      return <p className="career-info-code" role="status">Loading majors...</p>;
    }
    if (majorsStatus === 'error') {
      return <p className="career-info-code">Could not load majors.</p>;
    }
    if (careerMajors.length === 0) {
      return <p className="career-info-code">No majors found</p>;
    }
    return (
      <ul className="career-majors-list">
        {careerMajors.map((m) => (
          <li key={m.program_name || m.major_name} className="career-major-item">
            {/* Was an <a href={msu_url}>. The catalog export has no program URL,
                so this opens the major's catalog detail instead. */}
            <button
              type="button"
              className="career-major-link"
              onClick={() => setMajorFor({ careerId: selectedCareer.id, major: m })}
            >
              {m.major_name}
            </button>
            <img src="/arrow_right.svg" className="arrow-icon" alt="" aria-hidden="true" />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="results-card career-info-card">
      <h2>Career Information</h2>
      <ul className="career-info-list">
        <li>
          <strong>Title</strong>
          <p className="career-info-title">
            {selectedCareer ? selectedCareer.title : PLACEHOLDER}
          </p>
        </li>
        <li>
          <strong>Description</strong>
          <p className="career-info-description">
            {selectedCareer ? selectedCareer.description : PLACEHOLDER}
          </p>
        </li>
        <li>
          <strong>Related Majors</strong>
          <div className="career-majors-slot">{renderMajors()}</div>
        </li>
        <li>
          <strong>Source</strong>
          <p className="career-info-code">
            {selectedCareer
              ? selectedCareer.source === 'ml' ? 'AI Recommended' : 'Database Match'
              : PLACEHOLDER}
          </p>
        </li>
      </ul>

      {/* Always rendered, disabled when there is nothing to view - appearing on
          selection was another source of layout growth. */}
      <button
        className="results-continue-btn career-info-more-btn"
        onClick={() => selectedCareer && setModalFor(selectedCareer.id)}
        disabled={!selectedCareer}
        aria-label="View more about this career"
      >
        View more about this career
      </button>

      {showModal && selectedCareer && (
        <CareerDetailModal
          career={selectedCareer}
          careerMajors={careerMajors}
          onClose={() => setModalFor(null)}
        />
      )}

      {viewedMajor && (
        <MajorDetailModal major={viewedMajor} onClose={() => setMajorFor(null)} />
      )}
    </div>
  );
}
