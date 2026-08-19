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
/**
 * One MSU program linked to a career, as returned by /api/majors/:onetsoc_code.
 *
 * The first three fields are the original contract. The rest come from the MSU
 * catalog import (see Backend/data/DataConversionPipeline.md).
 *
 * `msu_url` is currently always null: the official catalog export carries no
 * program webpage column, and the previous values came from a scraper that sent
 * 60 rows to msudenver.edu/events/. Kept in the type because the backend still
 * sends the field and a catalog deep-link may populate it later.
 */
export interface CareerMajor {
  major_name: string;
  match_strength: number;
  msu_url: string | null;
  program_name: string;
  degree_type: string;
  department: string;
  cip_code: string | null;
  courses: string[];
}

/** Majors linked to a career. Returns [] for a career with none (404). */
export async function getMajors(onetsocCode: string): Promise<CareerMajor[]> {
  const response = await fetch(`${API_URL}/api/majors/${onetsocCode}`);
  if (!response.ok) {
    // 404 means "no majors for this career", which is a valid empty result
    // rather than a failure the UI should surface as an error.
    if (response.status === 404) return [];
    throw new Error('Failed to fetch majors');
  }
  return response.json();
}
