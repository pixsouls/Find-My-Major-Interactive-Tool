import type { CareerMajor } from '../utils/api';
import './MajorDetailContent.css';

interface Props {
  major: CareerMajor;
}

/**
 * Presentational detail for one MSU program. No dialog chrome of its own, so it
 * can be shown standalone (MajorDetailModal, opened from the Career Information
 * panel) or swapped into the career dialog in place of the career fields.
 */
export default function MajorDetailContent({ major }: Props) {
  return (
    <>
      <ul className="major-detail-fields">
        <li>
          <strong>Program</strong>
          <p>{major.program_name || major.major_name}</p>
        </li>
        <li>
          <strong>Degree</strong>
          <p>{major.degree_type || 'Not listed'}</p>
        </li>
        <li>
          <strong>Department</strong>
          <p>{major.department || 'Not listed'}</p>
        </li>
        <li>
          <strong>CIP Code</strong>
          <p>{major.cip_code ?? 'Not listed'}</p>
        </li>
      </ul>

      <div className="major-detail-courses">
        <h3 className="major-detail-subhead">
          Courses{major.courses.length > 0 ? ` (${major.courses.length})` : ''}
        </h3>
        {major.courses.length > 0 ? (
          // Scrolls in its own container: some programs list 20+ courses and
          // the dialog is already capped at 80vh.
          <ul className="major-detail-course-list">
            {major.courses.map((code) => (
              <li key={code} className="major-detail-course">{code}</li>
            ))}
          </ul>
        ) : (
          <p className="major-detail-empty">No courses listed for this program.</p>
        )}
      </div>

      {major.msu_url && (
        <a
          className="career-modal-major-btn"
          href={major.msu_url}
          target="_blank"
          rel="noreferrer"
        >
          Show me the MSU page for {major.major_name}
        </a>
      )}
    </>
  );
}
