import { useId } from 'react';
import './ToolTip.css';

interface TooltipProps {
  text: string;
  /** Accessible name for the trigger. Defaults to a generic "More information". */
  label?: string;
}

export default function Tooltip({ text, label = 'More information' }: TooltipProps) {
  const id = useId();

  return (
    <span className="tooltip-wrapper">
      {/* A real button so the tooltip is reachable by keyboard; the icon is
          decorative and the description is carried by aria-describedby. */}
      <button
        type="button"
        className="tooltip-trigger"
        aria-label={label}
        aria-describedby={id}
      >
        <img src="/Tooltip.svg" className="tooltip-icon" alt="" aria-hidden="true" />
      </button>
      <span className="tooltip-box" id={id} role="tooltip">{text}</span>
    </span>
  );
}
