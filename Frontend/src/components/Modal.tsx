import { useEffect, useId, useRef } from 'react';
import './Modal.css';

interface ModalProps {
  /** Visible dialog title. Also becomes the dialog's accessible name. */
  title: string;
  onClose: () => void;
  /** "alertdialog" for destructive confirmations, so SGRs announce it urgently. */
  role?: 'dialog' | 'alertdialog';
  /**
   * Element to focus on open. Defaults to the close button.
   * ConfirmDialog uses this to start on the SAFE option rather than the
   * destructive one.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Optional control rendered to the left of the title, e.g. a Back button. */
  leading?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The one dialog shell in the app.
 *
 * Owns the focus contract that a modal has to get right: focus moves in on
 * open, Tab cycles inside rather than walking the page behind the overlay,
 * Escape closes, and focus returns to whatever opened it. This logic was
 * originally written in CareerDetailModal and is relocated here unchanged so
 * the three dialogs cannot drift apart.
 */
export default function Modal({
  title,
  onClose,
  role = 'dialog',
  initialFocusRef,
  leading,
  children,
}: ModalProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    // Remember what opened the dialog so focus can be handed back on close.
    const opener = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? closeRef.current)?.focus();

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
    // initialFocusRef is read once on open by design - re-running on a ref
    // identity change would yank focus mid-interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  return (
    <div className="career-modal-overlay" onClick={onClose}>
      <div
        className="career-modal-box"
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button className="career-modal-close" onClick={onClose} aria-label="Close" ref={closeRef}>
          <span aria-hidden="true">&times;</span>
        </button>

        <div className="modal-heading-row">
          {leading}
          <h2 className="career-modal-title" id={titleId}>{title}</h2>
        </div>

        {children}
      </div>
    </div>
  );
}
