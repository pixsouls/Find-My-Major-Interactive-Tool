import { useState, useEffect, useMemo, useRef } from "react";
import "./ResultsPage.css";
import Tooltip from "./ToolTip";
import MajorCard, { MajorCardSkeleton } from "./MajorCard";
import EmailSection from "./EmailSection";
import CareerInfoPanel, { type MajorsStatus } from "./CareerInfoPanel";
import ConfirmDialog from "./ConfirmDialog";
import { getCareers, getMajors, type Career, type CareerMajor } from "../utils/api";
import { getMLCareers, type MLCareer } from "../utils/mlCareers";

type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";

interface ResultsPageProps {
  scores: Record<RiasecType, number>;
  questionCount: number;
  onRestart: () => void;
  onBack: () => void;
  onContinue: () => void;
  canGoBack: boolean;
}

// unified career type that works for both sources
interface DisplayCareer {
  id: string;
  title: string;
  description: string;
  source: 'db' | 'ml';
}

type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * A fixed position in the recommendation list. Even positions prefer the
 * database, odd positions the AI model, which preserves the alternating order
 * the page has always had. Slots exist from first paint so the list occupies
 * its final height immediately and nothing shifts as results arrive.
 */
interface Slot {
  source: 'db' | 'ml';
  career: DisplayCareer | null;
}

const DISPLAY_COUNT = 10;
const UNDO_MS = 6000;

const makeSlots = (): Slot[] =>
  Array.from({ length: DISPLAY_COUNT }, (_, i) => ({
    source: i % 2 === 0 ? 'db' : 'ml',
    career: null,
  }));

const toDisplay = (c: Career): DisplayCareer => ({
  id: c.onetsoc_code,
  title: c.title,
  description: c.description,
  source: 'db',
});

const mlToDisplay = (c: MLCareer): DisplayCareer => ({
  id: c['O*NET-SOC Code'],
  title: c.Title,
  description: c['Career Category'],
  source: 'ml',
});

/** First career from `list` not already on screen and not removed by the user. */
function firstUnused(
  list: DisplayCareer[],
  usedIds: Set<string>,
  usedTitles: Set<string>,
  removed: Set<string>
): DisplayCareer | null {
  for (const c of list) {
    if (removed.has(c.id)) continue;
    if (!usedIds.has(c.id) && !usedTitles.has(c.title)) return c;
  }
  return null;
}

/**
 * Build the whole list from scratch: what is loaded, minus what the user
 * removed. Preferring the slot's own source and falling back to the other is
 * what makes a failed AI request degrade to a database-only list rather than
 * blanking the section.
 *
 * Pure and fully derived, which buys two things: StrictMode's double-invoked
 * renders cannot double-consume a cursor, and undo is just "stop excluding this
 * id" - the career deterministically returns to the position it came from.
 */
function fillSlots(
  db: DisplayCareer[],
  ml: DisplayCareer[],
  dbStatus: LoadStatus,
  mlStatus: LoadStatus,
  removed: Set<string>
): Slot[] {
  const usedIds = new Set<string>();
  const usedTitles = new Set<string>();

  return makeSlots().map((slot) => {
    const order: Array<'db' | 'ml'> = slot.source === 'db' ? ['db', 'ml'] : ['ml', 'db'];
    for (const src of order) {
      const ready = src === 'db' ? dbStatus === 'ready' : mlStatus === 'ready';
      if (!ready) continue;
      const pick = firstUnused(src === 'db' ? db : ml, usedIds, usedTitles, removed);
      if (pick) {
        usedIds.add(pick.id);
        usedTitles.add(pick.title);
        return { ...slot, career: pick };
      }
    }
    return slot;
  });
}

export default function ResultsPage({
  scores,
  questionCount,
  onRestart,
  onBack,
  canGoBack,
  onContinue
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

  // Tagged with the career it belongs to, so "still loading" is derived from a
  // mismatch rather than written by an effect on every selection change.
  const [majorsResult, setMajorsResult] = useState<{
    careerId: string;
    majors: CareerMajor[];
    status: 'ready' | 'error';
  } | null>(null);

  const [dbCareers, setDbCareers] = useState<DisplayCareer[]>([]);
  const [mlCareers, setMlCareers] = useState<DisplayCareer[]>([]);
  const [dbStatus, setDbStatus] = useState<LoadStatus>('loading');
  const [mlStatus, setMlStatus] = useState<LoadStatus>('loading');
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [selectedCareer, setSelectedCareer] = useState<DisplayCareer | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [lastRemoved, setLastRemoved] = useState<{
    id: number;
    career: DisplayCareer;
  } | null>(null);

  const removalCounter = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The visible list is derived, never stored: loaded results minus removals.
  const slots = useMemo(
    () => fillSlots(dbCareers, mlCareers, dbStatus, mlStatus, removedIds),
    [dbCareers, mlCareers, dbStatus, mlStatus, removedIds]
  );

  const majorsStatus: MajorsStatus = !selectedCareer
    ? 'idle'
    : majorsResult?.careerId === selectedCareer.id
      ? majorsResult.status
      : 'loading';

  const careerMajors =
    selectedCareer && majorsResult?.careerId === selectedCareer.id ? majorsResult.majors : [];

  // Arriving here replaces the whole view, so move focus to the new page
  // heading - otherwise focus is dropped to <body> and keyboard users restart
  // from the top of the document.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Trait bars grow from zero on mount. One frame at 0% gives the browser a
  // starting value to transition from; .fill already carries the transition.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setBarsAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Majors for the selected career. Nothing is set synchronously here - the
  // "loading" state falls out of majorsResult not yet matching this career.
  useEffect(() => {
    if (!selectedCareer) return;

    let cancelled = false;
    const careerId = selectedCareer.id;

    getMajors(careerId)
      .then((data) => {
        if (!cancelled) setMajorsResult({ careerId, majors: data.slice(0, 3), status: 'ready' });
      })
      .catch(() => {
        if (!cancelled) setMajorsResult({ careerId, majors: [], status: 'error' });
      });

    // Clicking through careers quickly must not let a slow earlier response
    // overwrite the current selection's majors.
    return () => { cancelled = true; };
  }, [selectedCareer]);

  // Both career sources load in PARALLEL. They used to be chained, so a slow
  // model request held up database results that had already arrived - and the
  // loading flag cleared when the database call settled, leaving a window where
  // the list was empty but no longer "loading", which rendered "No careers
  // found."
  useEffect(() => {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('sessionId', sessionId);
    }

    getCareers(scores, sessionId)
      .then((data) => {
        setDbCareers(data.map(toDisplay));
        setDbStatus('ready');
      })
      .catch((err) => {
        console.error('DB careers error:', err);
        setDbStatus('error');
      });

    getMLCareers(scores)
      .then((data) => {
        setMlCareers(data.map(mlToDisplay));
        setMlStatus('ready');
      })
      .catch((err) => {
        console.error('ML careers error:', err);
        setMlStatus('error');
      });
    // Fires once on mount by design. `scores` is fixed for the lifetime of this
    // page - re-running on it would re-request both sources and reshuffle the
    // list under the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The undo toast dismisses itself. Keyed on the removal object, so a second
  // removal restarts the countdown rather than inheriting the first deadline.
  useEffect(() => {
    if (!lastRemoved) return;
    const timer = setTimeout(() => setLastRemoved(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [lastRemoved]);

  const bothFailed = dbStatus === 'error' && mlStatus === 'error';
  const anyLoading = dbStatus === 'loading' || mlStatus === 'loading';
  const filledCount = slots.filter((s) => s.career).length;

  // Removing excludes an id; the derived list refills that position from the
  // same source. Undo drops the exclusion, and because the fill is
  // deterministic the career reappears exactly where it was.
  const removeCareer = (career: DisplayCareer) => {
    if (selectedCareer?.id === career.id) setSelectedCareer(null);
    setRemovedIds((prev) => new Set(prev).add(career.id));
    removalCounter.current += 1;
    setLastRemoved({ id: removalCounter.current, career });
  };

  const undoRemove = () => {
    if (!lastRemoved) return;
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(lastRemoved.career.id);
      return next;
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
          onClick={() => setConfirmRestart(true)}
          aria-label="Restart the quiz"
        >
          ↺
        </button>
      </div>

      <div className="results-hero">
        <div>
          <p className="small-text highlight">Assessment Complete</p>
          <h1 className="headline" ref={headingRef} tabIndex={-1}>Your Career Profile</h1>
          <p className="subtext">Based on {questionCount} questions</p>
        </div>
        <div className="holland-reveal-card">
          <p className="results-label">Your Holland Code</p>
          <h2 className="holland-code">
            {/* Spelled out for screen readers so "AEI" is not read as a word;
                the visible text is unchanged. */}
            <span className="visually-hidden">
              Your Holland code is {hollandCode.split("").join(" ")}
            </span>
            <span aria-hidden="true">{hollandCode}</span>
          </h2>
          <p className="primary">
            {traitLabels[topTrait]} ({topTrait})
          </p>
        </div>
      </div>

      <div className="dashboard-grid">

        <div className="left-panel">

          <div className="results-card">
            <div className="results-card-header">
              <h2>Your Top Traits</h2>
              <Tooltip
                label="About your top traits"
                text="Your RIASEC score (Holland score) based on your answers in the test. This peronality type score."
              />
            </div>
            {topTraits.map(([trait, score]) => {
              // Answer weights run -2..+2, so a raw score can be negative (and
              // in principle exceed 20). One clamped percentage drives both the
              // bar width and the announced value so the two cannot diverge.
              const percent = Math.round(Math.min(100, Math.max(0, (score / 20) * 100)));
              return (
                <div key={trait} className="trait-row">
                  <span>{traitLabels[trait]}</span>
                  <div
                    className="bar"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={`${percent}%`}
                    aria-label={`${traitLabels[trait]} score`}
                  >
                    <div
                      className="fill"
                      style={{ width: barsAnimated ? `${percent}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <CareerInfoPanel
            selectedCareer={selectedCareer}
            careerMajors={careerMajors}
            majorsStatus={majorsStatus}
          />

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

          <EmailSection scores={scores} />

        </div>

        <div className="right-panel">
          <div className="results-card">
            <div className="results-card-header">
              <h2>Recommended Careers</h2>
              <Tooltip
                label="About recommended careers"
                text="Click to select. Recommended careers based on your answers in the test. "
              />
            </div>

            {/* Announced once rather than per card, so a screen reader is not
                read ten identical "loading" messages. */}
            <p className="visually-hidden" role="status">
              {anyLoading
                ? 'Loading recommended careers'
                : `${filledCount} recommended careers loaded`}
            </p>

            {bothFailed ? (
              <p className="careers-status careers-error">
                Failed to load careers. Please try again later.
              </p>
            ) : !anyLoading && filledCount === 0 ? (
              <p className="careers-status">No careers found.</p>
            ) : (
              <div className="majors-grid">
                {slots.map((slot, i) => {
                  const career = slot.career;
                  return career ? (
                    <MajorCard
                      key={career.id}
                      title={career.title}
                      description={career.description}
                      onClick={() => setSelectedCareer(career)}
                      onRemove={() => removeCareer(career)}
                      isAI={career.source === 'ml'}
                    />
                  ) : (
                    <MajorCardSkeleton key={`skeleton-${i}`} />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {lastRemoved && (
        <div className="undo-toast" role="status">
          <div className="undo-toast-row">
            <span className="undo-text">{lastRemoved.career.title} removed</span>
            <button onClick={undoRemove} className="undo-btn">
              Undo
            </button>
            <button
              onClick={() => setLastRemoved(null)}
              className="undo-dismiss"
              aria-label="Dismiss"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          {/* Decorative countdown. Re-keyed per removal so the animation
              restarts instead of continuing the previous one. */}
          <div className="undo-progress" aria-hidden="true">
            <div className="undo-progress-fill" key={lastRemoved.id} />
          </div>
        </div>
      )}

      {confirmRestart && (
        <ConfirmDialog
          title="Restart the quiz?"
          message="Your answers and results so far will be cleared."
          confirmLabel="Yes, I'm sure"
          cancelLabel="No"
          onConfirm={() => { setConfirmRestart(false); onRestart(); }}
          onCancel={() => setConfirmRestart(false)}
        />
      )}

    </div>
  );
}
