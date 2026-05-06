import { useState } from "react";
import "./Email.css";

interface EmailSectionProps {
  scores: Record<string, number>;
}

export default function EmailSection({ scores }: EmailSectionProps) {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const topTrait = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

  const sendEmail = async () => {
    if (!email) {
      alert('Please enter a valid email address.');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/email/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Find My Major Result',
          text: `Your top trait is ${topTrait}.`
        })
      });
      if (!response.ok) throw new Error('Failed to send email');
      alert('Email sent successfully!');
      setEmailSent(false);
      setEmail('');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    }
  };

  return (
    <div
      className="email-save-card"
      role="region"
      aria-label="Save your quiz results by email"
    >
      {!emailSent ? (
        <button
          className="email-button"
          onClick={() => setEmailSent(true)}
          aria-label="Save your results by entering your email"
        >
          Save Results
        </button>
      ) : (
        <div
          className="email-section"
          role="form"
          aria-label="Enter email to receive your results"
        >
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="email-input"
            aria-label="Email address"
            aria-required="true"
          />
          <button
            className="email-button"
            onClick={sendEmail}
            aria-label="Send your quiz results to your email"
          >
            Send Results
          </button>
        </div>
      )}
    </div>
  );
}