// api/careers.ts

// import from you .env virtual enviroment.
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

export async function getCareers(scores: RIASECScores): Promise<Career[]> {
  const response = await fetch(`${API_URL}/api/careers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scores),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch careers');
  }

  return response.json();
}