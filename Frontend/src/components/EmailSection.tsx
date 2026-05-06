import "./Email.css";

interface EmailSectionProps {
  scores: Record<string, number>;
  email: string;
  setEmail: (email: string) => void;
  emailSent: boolean;
  setEmailSent: (value: boolean) => void;
  sendEmail: (topTrait: string) => void;
}

export default function EmailSection({
  scores,
  email,
  setEmail,
  emailSent,
  setEmailSent,
  sendEmail
}: EmailSectionProps) {
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
            onClick={() =>
              sendEmail(
                Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
              )
            }
            aria-label="Send your quiz results to your email"
          >
            Send Results
          </button>
        </div>
      )}
    </div>
  );
}