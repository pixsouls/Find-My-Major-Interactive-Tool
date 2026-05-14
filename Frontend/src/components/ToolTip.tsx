import './Tooltip.css';

interface TooltipProps {
  text: string;
}

export default function Tooltip({ text }: TooltipProps) {
  return (
    <span className="tooltip-wrapper">
      <img src="../../Tooltip.svg" className="tooltip-icon" alt="info" />
      <span className="tooltip-box">{text}</span>
    </span>
  );
}