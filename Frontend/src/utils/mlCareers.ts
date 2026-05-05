import * as ort from "onnxruntime-web";

ort.env.wasm.numThreads = 1;
//ort.env.wasm.wasmPaths = "/ml/";

export interface MLCareer {
  "O*NET-SOC Code": string;
  Title: string;
  "Career Category": string;
  Realistic: number;
  Investigative: number;
  Artistic: number;
  Social: number;
  Enterprising: number;
  Conventional: number;
  Match_Score?: number;
}

type RiasecScores = {
  R: number;
  I: number;
  A: number;
  S: number;
  E: number;
  C: number;
};

const categories = [
  "Realistic",
  "Investigative",
  "Artistic",
  "Social",
  "Enterprising",
  "Conventional",
];

function normalizeScores(scores: RiasecScores): number[] {
  const raw = [scores.R, scores.I, scores.A, scores.S, scores.E, scores.C];
  const min = Math.min(...raw);
  const max = Math.max(...raw);

  return raw.map((v) => (v - min) / (max - min || 1));
}

function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

let cachedSession: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!cachedSession) {
    cachedSession = await ort.InferenceSession.create("/ml/riasec_model.onnx", {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "disabled",
    });
  }

  return cachedSession;
}

function fallbackTopCategories(scores: RiasecScores): string[] {
  const traitToCategory: Record<keyof RiasecScores, string> = {
    R: "Realistic",
    I: "Investigative",
    A: "Artistic",
    S: "Social",
    E: "Enterprising",
    C: "Conventional",
  };

  return (Object.entries(scores) as [keyof RiasecScores, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([trait]) => traitToCategory[trait]);
}

async function predictTopCategories(
  studentScores: number[],
  scores: RiasecScores
): Promise<string[]> {
  try {
    const session = await getSession();

    console.log("ML input names:", session.inputNames);
    console.log("ML output names:", session.outputNames);

    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];

    const inputTensor = new ort.Tensor(
      "float32",
      Float32Array.from(studentScores),
      [1, 6]
    );

    const results = await session.run({
      [inputName]: inputTensor,
    });

    const output = results[outputName];
    const data = Array.from(output.data as Iterable<number | string>);

    console.log("ML raw output:", data);

    if (data.length === 0) {
      return fallbackTopCategories(scores);
    }

    if (typeof data[0] === "string") {
      return data.slice(0, 3) as string[];
    }

    const numericData = data.map(Number);

    return numericData
      .map((score, index) => ({
        category: categories[index],
        score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.category);
  } catch (err) {
    console.error("ONNX model failed. Using fallback logic:", err);
    return fallbackTopCategories(scores);
  }
}

function getCareerValue(job: any, possibleKeys: string[]): any {
  for (const key of possibleKeys) {
    if (job[key] !== undefined && job[key] !== null) {
      return job[key];
    }
  }

  return undefined;
}

function cleanCareer(job: any): MLCareer {
  return {
    "O*NET-SOC Code": String(
      getCareerValue(job, [
        "O*NET-SOC Code",
        "onetsoc_code",
        "onetCode",
        "onet_soc_code",
      ]) ?? ""
    ),

    Title: String(
      getCareerValue(job, ["Title", "title", "Career", "career"]) ?? ""
    ),

    "Career Category": String(
      getCareerValue(job, [
        "Career Category",
        "career_category",
        "category",
        "Category",
      ]) ?? ""
    ),

    Realistic: Number(getCareerValue(job, ["Realistic", "R"]) ?? 0),
    Investigative: Number(getCareerValue(job, ["Investigative", "I"]) ?? 0),
    Artistic: Number(getCareerValue(job, ["Artistic", "A"]) ?? 0),
    Social: Number(getCareerValue(job, ["Social", "S"]) ?? 0),
    Enterprising: Number(getCareerValue(job, ["Enterprising", "E"]) ?? 0),
    Conventional: Number(getCareerValue(job, ["Conventional", "C"]) ?? 0),
  };
}

export async function getMLCareers(scores: RiasecScores): Promise<MLCareer[]> {
  const studentScores = normalizeScores(scores);
  const topCategories = await predictTopCategories(studentScores, scores);

  console.log("Top ML categories:", topCategories);

  const jobsResponse = await fetch("/ml/riasec_jobs_db.json");

  if (!jobsResponse.ok) {
    throw new Error("Failed to load ML careers JSON file.");
  }

  const rawJobs = await jobsResponse.json();

  const jobsDatabase: MLCareer[] = rawJobs
    .map((job: any) => cleanCareer(job))
    .filter((job: MLCareer) => job["O*NET-SOC Code"] && job.Title);

  const candidates = jobsDatabase.filter((job) =>
    topCategories.includes(job["Career Category"])
  );

  const jobsToRank = candidates.length > 0 ? candidates : jobsDatabase;

  const ranked = jobsToRank.map((job) => {
    const jobScores = [
      job.Realistic,
      job.Investigative,
      job.Artistic,
      job.Social,
      job.Enterprising,
      job.Conventional,
    ];

    return {
      ...job,
      Match_Score: calculateCosineSimilarity(studentScores, jobScores),
    };
  });

  return ranked.sort((a, b) => (b.Match_Score ?? 0) - (a.Match_Score ?? 0));
}