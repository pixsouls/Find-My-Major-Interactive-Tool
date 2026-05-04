import pg from 'pg';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

class Progress {
  constructor(total) {
    this.total = total;
    this.completed = 0;
  }

  done(message) {
    this.completed++;
    console.log(`[${this.completed}/${this.total}] ${message}`);
  }

  fail(message, err) {
    console.error(`[FAILED ${this.completed}/${this.total}] ${message}: ${err.message}`);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('[WARNING] This will drop and recreate all tables. Continue? [Y/N] ', async (answer) => {
  rl.close();
  if (answer.toLowerCase() === 'y') {
    await initDatabase();
  } else {
    console.log('Aborted.');
    process.exit(0);
  }
});

async function initDatabase() {
  const progress = new Progress(5);

  const db = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await db.query(`DROP TABLE IF EXISTS "F2Collected", "AdaptedCareers", interests, occupation_data CASCADE`);
    console.log('Old tables dropped.');

    // occupation_data
    console.log('Now loading occupation_data table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS occupation_data (
        onetsoc_code VARCHAR(10) NOT NULL,
        title VARCHAR(150) NOT NULL,
        description VARCHAR(1000) NOT NULL,
        PRIMARY KEY (onetsoc_code)
      )
    `);

    const occupationFile = fs.readFileSync(path.join(__dirname, 'raw/03_occupation_data.sql'), 'utf8');
    await db.query(occupationFile);
    progress.done('Occupation data loaded');

    // interests
    console.log('Now loading interests table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS interests (
        onetsoc_code VARCHAR(10) NOT NULL,
        element_id VARCHAR(20) NOT NULL,
        scale_id VARCHAR(3) NOT NULL,
        data_value DECIMAL(5,2) NOT NULL,
        date_updated DATE NOT NULL,
        domain_source VARCHAR(30) NOT NULL,
        FOREIGN KEY (onetsoc_code) REFERENCES occupation_data(onetsoc_code)
      )
    `);

    // F2Collected
    console.log('Now loading F2Collected table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS "F2Collected" (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64) UNIQUE,
        user_R DECIMAL(5,2),
        user_I DECIMAL(5,2),
        user_A DECIMAL(5,2),
        user_S DECIMAL(5,2),
        user_E DECIMAL(5,2),
        user_C DECIMAL(5,2),
        questions_answered INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const interestsFile = fs.readFileSync(path.join(__dirname, 'raw/13_interests.sql'), 'utf8');
    await db.query(interestsFile);
    progress.done('Interests data loaded');

    // AdaptedCareers
    await db.query(`
      CREATE TABLE IF NOT EXISTS "AdaptedCareers" (
        onetsoc_code VARCHAR(10) NOT NULL,
        title VARCHAR(150) NOT NULL,
        "R" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "I" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "A" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "S" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "E" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "C" DECIMAL(5,2) NOT NULL DEFAULT 0,
        PRIMARY KEY (onetsoc_code)
      )
    `);
    progress.done('AdaptedCareers table created');

    await db.query(`
      INSERT INTO "AdaptedCareers" (onetsoc_code, title, "R", "I", "A", "S", "E", "C")
      SELECT
        o.onetsoc_code,
        o.title,
        MAX(CASE WHEN i.element_id = '1.B.1.a' THEN i.data_value ELSE 0 END) AS "R",
        MAX(CASE WHEN i.element_id = '1.B.1.b' THEN i.data_value ELSE 0 END) AS "I",
        MAX(CASE WHEN i.element_id = '1.B.1.c' THEN i.data_value ELSE 0 END) AS "A",
        MAX(CASE WHEN i.element_id = '1.B.1.d' THEN i.data_value ELSE 0 END) AS "S",
        MAX(CASE WHEN i.element_id = '1.B.1.e' THEN i.data_value ELSE 0 END) AS "E",
        MAX(CASE WHEN i.element_id = '1.B.1.f' THEN i.data_value ELSE 0 END) AS "C"
      FROM interests i
      JOIN occupation_data o ON i.onetsoc_code = o.onetsoc_code
      GROUP BY o.onetsoc_code, o.title
    `);
    progress.done('AdaptedCareers populated');

  } catch (err) {
    console.error('Database initialization error:', err.message);
  } finally {
    await db.end();
    console.log('Done.');
  }
}