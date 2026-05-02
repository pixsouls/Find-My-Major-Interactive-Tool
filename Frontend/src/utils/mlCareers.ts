const API_URL = import.meta.env.VITE_API_URL;

export interface MLCareer {
  'O*NET-SOC Code': string;
  Title: string;
  'Career Category': string;
  Realistic: number;
  Investigative: number;
  Artistic: number;
  Social: number;
  Enterprising: number;
  Conventional: number;
  Match_Score?: number;
}

function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getMLCareers(scores: {
  R: number; I: number; A: number; S: number; E: number; C: number;
}): Promise<MLCareer[]> {

  const response = await fetch(`${API_URL}/api/ml-careers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scores)
  });

  if (!response.ok) throw new Error('Failed to get ML predictions');

  const { predictedCategory, normalized } = await response.json();
  console.log('ML predicted category:', predictedCategory);

  const jobsResponse = await fetch('/ml/riasec_jobs_db.json');
  const jobsDatabase: MLCareer[] = await jobsResponse.json();

  const ranked = jobsDatabase.map(job => {
    const jobScores = [
      job.Realistic, job.Investigative, job.Artistic,
      job.Social, job.Enterprising, job.Conventional
    ];
    let score = calculateCosineSimilarity(normalized, jobScores);
    if (job['Career Category'] === predictedCategory) {
      score *= 1.2;
    }
    return { ...job, Match_Score: score };
  });

  return ranked.sort((a, b) => (b.Match_Score ?? 0) - (a.Match_Score ?? 0));
}