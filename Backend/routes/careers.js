import express from 'express';
import db from '../db.js';

const router = express.Router();

router.post('/careers', async (req, res) => {
  const { R = 0, I = 0, A = 0, S = 0, E = 0, C = 0 } = req.body;
  try {
    const result = await db.execute({
      sql: `SELECT onetsoc_code, title, R, I, A, S, E, C
            FROM AdaptedCareers
            ORDER BY (R * ? + I * ? + A * ? + S * ? + E * ? + C * ?) DESC
            LIMIT 10`,
      args: [R, I, A, S, E, C],
    });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch careers' });
  }
});

export default router;