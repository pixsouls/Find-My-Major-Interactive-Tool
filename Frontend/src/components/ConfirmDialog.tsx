import { useRef } from 'react';
import Modal from './Modal';
import './ConfirmDialog.css';

interface Props {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive-action confirmation.
 *
 * Focus starts on the CANCEL button, not confirm: a keyboard user who hits
 * Enter reflexively should not lose their quiz progress. role="alertdialog"
 * so screen readers announce it as interrupting rather than incidental.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal title={title} onClose={onCancel} role="alertdialog" initialFocusRef={cancelRef}>
      {message && <p className="confirm-message">{message}</p>}
      <div className="confirm-actions">
        <button type="button" className="confirm-cancel" onClick={onCancel} ref={cancelRef}>
          {cancelLabel}
        </button>
        <button type="button" className="confirm-accept" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
