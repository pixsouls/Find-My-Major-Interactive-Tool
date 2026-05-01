import * as ort from 'onnxruntime-web/wasm';

const session = await ort.InferenceSession.create('/ml/riasec_model.onnx', {
  executionProviders: ['wasm']
});

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

  // normalize scores to 0-1
  const raw = [scores.R, scores.I, scores.A, scores.S, scores.E, scores.C];
  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const normalized = raw.map(v => (v - min) / (max - min || 1));

  // load and run model
  const session = await ort.InferenceSession.create('/ml/riasec_model.onnx');
  const inputTensor = new ort.Tensor('float32', Float32Array.from(normalized), [1, 6]);
  const results = await session.run(
    { float_input: inputTensor },
    ['output_label']
  );

  const predictedCategory = (results['output_label'].data as string[])[0];
  console.log('ML predicted category:', predictedCategory);

  // load jobs database
  const response = await fetch('/ml/riasec_jobs_db.json');
  const jobsDatabase: MLCareer[] = await response.json();

  // score ALL jobs by cosine similarity, but boost jobs in the predicted category
  const ranked = jobsDatabase.map(job => {
    const jobScores = [
      job.Realistic, job.Investigative, job.Artistic,
      job.Social, job.Enterprising, job.Conventional
    ];
    let score = calculateCosineSimilarity(normalized, jobScores);

    // boost predicted category by 20%
    if (job['Career Category'] === predictedCategory) {
      score *= 1.2;
    }

    return { ...job, Match_Score: score };
  });

  return ranked.sort((a, b) => (b.Match_Score ?? 0) - (a.Match_Score ?? 0));
}