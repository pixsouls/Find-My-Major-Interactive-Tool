import './FooterBar.css';

import { LocationIcon, PhoneIcon } from './icons';

interface FooterBarProps {
  logoSrc?: string;
  denverUrl: string;
  phoneText: string;
}

export default function FooterBar({
  logoSrc = '/msu_logo.jpg',
  denverUrl,
  phoneText
}: FooterBarProps) {
  return (
    <footer className="footer-bar" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-left">
          <a
            className="footer-logo-link"
            href="https://www.msudenver.edu/"
            target="_blank"
            rel="noreferrer"
            aria-label="MSU Denver website"
          >
            <img className="footer-logo" src={logoSrc} alt="MSU Denver" />
          </a>
        </div>

        <div className="footer-right">
          <a
            className="footer-link"
            href={denverUrl}
            target="_blank"
            rel="noreferrer"
          >
            <LocationIcon />
            <span>Denver, Colorado</span>
          </a>

          <div className="footer-phone" aria-label={`Phone: ${phoneText}`}>
            <PhoneIcon />
            <span>{phoneText}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
