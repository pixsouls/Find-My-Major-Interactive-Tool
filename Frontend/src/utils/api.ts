const API_URL = import.meta.env.VITE_API_URL;

export interface RIASECScores {
  R?: number;
  I?: number;
  A?: number;
  S?: number;
  E?: number;
  C?: number;
}

export interface Career {
  onetsoc_code: string;
  title: string;
  description: string;
  [key: string]: string | number;
}

export async function getCareers(scores: RIASECScores, sessionId: string): Promise<Career[]> {
  const response = await fetch(`${API_URL}/api/careers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId
    },
    body: JSON.stringify(scores),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch careers');
  }

  return response.json();
}

export async function saveScores(scores: RIASECScores, questionsAnswered: number): Promise<void> {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('sessionId', sessionId);
  }

  try {
    await fetch(`${API_URL}/api/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({ scores, questionsAnswered }),
    });
  } catch (err) {
    console.error('Failed to save scores:', err);
  }
}