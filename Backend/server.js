import express from "express";
import cors from "cors";
import pg from "pg";
import emailRouter from "./utils/email.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const RIASEC = {
  R: "1.B.1.a",
  I: "1.B.1.b",
  A: "1.B.1.c",
  S: "1.B.1.d",
  E: "1.B.1.e",
  C: "1.B.1.f",
};

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

db.connect((err) => {
  if (err) {
    return console.error("Database connection error:", err.message);
  }

  console.log("Connected to database.");
});

app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

/*
  Backup database careers.

  Frontend calls:
  GET /api/careers?hollandCode=RIA

  ML careers are still primary.
  This route only provides backup/extra careers.
*/
app.get("/api/careers", async (req, res) => {
  const { hollandCode } = req.query;

  if (!hollandCode || typeof hollandCode !== "string") {
    return res.status(400).json({ error: "hollandCode is required" });
  }

  const traits = hollandCode
    .split("")
    .filter((trait) => Object.keys(RIASEC).includes(trait));

  if (traits.length === 0) {
    return res.status(400).json({ error: "Invalid hollandCode" });
  }

  const elementIds = traits.map((trait) => RIASEC[trait]);

  try {
    const result = await db.query(
      `
      SELECT 
        o.onetsoc_code,
        o.title,
        o.description,
        AVG(i.data_value) AS match_score
      FROM occupation_data o
      JOIN interests i 
        ON o.onetsoc_code = i.onetsoc_code
      WHERE i.element_id = ANY($1)
      GROUP BY o.onetsoc_code, o.title, o.description
      ORDER BY match_score DESC
      LIMIT 50;
      `,
      [elementIds]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error loading database careers:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/majors-by-careers", async (req, res) => {
  const { onetCodes } = req.body;

  if (!Array.isArray(onetCodes) || onetCodes.length === 0) {
    return res.status(400).json({
      error: "onetCodes must be a non-empty array",
    });
  }

  try {
    const result = await db.query(
      `
      SELECT
        map.onetsoc_code,
        o.title AS career,
        maj.major_name,
        map.match_strength
      FROM mapping map
      JOIN majors maj 
        ON maj.id = map.major_id
      LEFT JOIN occupation_data o 
        ON o.onetsoc_code = map.onetsoc_code
      WHERE map.onetsoc_code = ANY($1)
        AND map.match_strength >= 0.85
      ORDER BY map.match_strength DESC;
      `,
      [onetCodes]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching majors by careers:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/*
  Save quiz scores.
*/
app.post("/api/scores", async (req, res) => {
  const { scores, questionsAnswered } = req.body;
  const sessionId = req.headers["x-session-id"] ?? "anonymous";

  const VALID_RIASEC = ["R", "I", "A", "S", "E", "C"];

  if (!scores || !Object.keys(scores).every((k) => VALID_RIASEC.includes(k))) {
    return res.status(400).json({ error: "Invalid RIASEC scores" });
  }

  try {
    await db.query(
      `
      INSERT INTO "user_scores" 
        (session_id, user_R, user_I, user_A, user_S, user_E, user_C, questions_answered)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (session_id) DO UPDATE SET
        user_R = CASE 
          WHEN EXCLUDED.questions_answered > "user_scores".questions_answered 
          THEN EXCLUDED.user_R 
          ELSE "user_scores".user_R 
        END,
        user_I = CASE 
          WHEN EXCLUDED.questions_answered > "user_scores".questions_answered 
          THEN EXCLUDED.user_I 
          ELSE "user_scores".user_I 
        END,
        user_A = CASE 
          WHEN EXCLUDED.questions_answered > "user_scores".questions_answered 
          THEN EXCLUDED.user_A 
          ELSE "user_scores".user_A 
        END,
        user_S = CASE 
          WHEN EXCLUDED.questions_answered > "user_scores".questions_answered 
          THEN EXCLUDED.user_S 
          ELSE "user_scores".user_S 
        END,
        user_E = CASE 
          WHEN EXCLUDED.questions_answered > "user_scores".questions_answered 
          THEN EXCLUDED.user_E 
          ELSE "user_scores".user_E 
        END,
        user_C = CASE 
          WHEN EXCLUDED.questions_answered > "user_scores".questions_answered 
          THEN EXCLUDED.user_C 
          ELSE "user_scores".user_C 
        END,
        questions_answered = GREATEST(
          "user_scores".questions_answered, 
          EXCLUDED.questions_answered
        ),
        created_at = CASE 
          WHEN EXCLUDED.questions_answered > "user_scores".questions_answered 
          THEN NOW() 
          ELSE "user_scores".created_at 
        END;
      `,
      [
        sessionId,
        scores.R ?? 0,
        scores.I ?? 0,
        scores.A ?? 0,
        scores.S ?? 0,
        scores.E ?? 0,
        scores.C ?? 0,
        questionsAnswered ?? 0,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving scores:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/collected", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        session_id, 
        user_R, 
        user_I, 
        user_A, 
        user_S, 
        user_E, 
        user_C, 
        questions_answered, 
        created_at
      FROM "user_scores"
      ORDER BY created_at DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error loading collected scores:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/email", emailRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});