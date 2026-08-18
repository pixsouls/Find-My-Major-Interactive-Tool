import { useEffect, useRef } from 'react';
import './CareerDetailModal.css';

interface CareerMajor {
  major_name: string;
  match_strength: number;
  msu_url: string | null;
}

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
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Remember what opened the dialog so focus can be handed back on close.
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      // Trap Tab inside the dialog; without this, focus walks through the
      // page behind the overlay.
      const focusable = boxRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, [onClose]);

  return (
    <div className="career-modal-overlay" onClick={onClose}>
      <div
        className="career-modal-box"
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="career-modal-title"
      >
        <button
          className="career-modal-close"
          onClick={onClose}
          aria-label="Close"
          ref={closeRef}
        >
          <span aria-hidden="true">×</span>
        </button>

        <h2 className="career-modal-title" id="career-modal-title">{career.title}</h2>

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

        {careerMajors.some(m => m.msu_url) && (
          <div className="career-modal-majors">
            {careerMajors.map((m) => (
              m.msu_url ? (
                <a
                  key={m.major_name}
                  href={m.msu_url}
                  target="_blank"
                  rel="noreferrer"
                  className="career-modal-major-btn"
                >
                  Show me the MSU page for {m.major_name}
                </a>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  );
}