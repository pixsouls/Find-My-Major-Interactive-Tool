import { useState } from 'react';
import Modal from './Modal';
import MajorDetailContent from './MajorDetailContent';
import type { CareerMajor } from '../utils/api';
import './CareerDetailModal.css';

interface DisplayCareer {
  id: string;
  title: string;
  description: string;
  source: 'db' | 'ml';
}

interface CareerDetailModalProps {
  career: DisplayCareer;
  careerMajors: CareerMajor[];
  onClose: () => void;
}

export default function CareerDetailModal({ career, careerMajors, onClose }: CareerDetailModalProps) {
  // Selecting a major swaps this dialog's CONTENT rather than opening a second
  // overlay - one dialog means one focus trap and no nested-modal problems.
  const [viewedMajor, setViewedMajor] = useState<CareerMajor | null>(null);

  if (viewedMajor) {
    return (
      <Modal
        title={viewedMajor.major_name}
        onClose={onClose}
        leading={
          <button
            type="button"
            className="modal-back-btn"
            onClick={() => setViewedMajor(null)}
          >
            <span aria-hidden="true">&larr;</span> Back
          </button>
        }
      >
        <MajorDetailContent major={viewedMajor} />
      </Modal>
    );
  }

  return (
    <Modal title={career.title} onClose={onClose}>
      <ul className="career-modal-fields">
        <li>
          <strong>Salary (Upper Quartile)</strong>
          <p>-</p>
        </li>
        <li>
          <strong>Salary (Median)</strong>
          <p>-</p>
        </li>
        <li>
          <strong>Salary (Lower Quartile)</strong>
          <p>-</p>
        </li>
        <li>
          <strong>Projected Growth</strong>
          <p>N/A</p>
        </li>
        <li>
          <strong>Job Satisfaction</strong>
          <p>N/A</p>
        </li>
      </ul>

      {careerMajors.length > 0 && (
        <div className="career-modal-majors">
          {careerMajors.map((m) => (
            <button
              key={m.program_name || m.major_name}
              type="button"
              className="career-modal-major-btn"
              onClick={() => setViewedMajor(m)}
            >
              More about {m.major_name}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
