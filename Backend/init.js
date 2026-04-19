import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// progress logger
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

const dbPath = path.join(__dirname, 'test.db');

rl.question('[WARNING] Old database exists, remove it? [Y/N] ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('Database deleted successfully');
      }
    } catch (err) {
      console.error('Error deleting database: ', err);
      rl.close();
      return; // stop if deletion failed
    }
  }

  rl.close();
  initDatabase(); // only start DB work after the prompt is answered
});

function initDatabase() {
  const progress = new Progress(5); // occupation, interests, F2Collected, AdaptedCareers created, AdaptedCareers populated

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) return console.error(err.message);
  });

  db.serialize(() => {

    console.log('Now loading occupation_data table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS occupation_data (
        onetsoc_code CHARACTER(10) NOT NULL,
        title CHARACTER VARYING(150) NOT NULL,
        description CHARACTER VARYING(1000) NOT NULL,
        PRIMARY KEY (onetsoc_code)
      )
    `, (err) => { if (err) progress.fail('occupation_data table', err) });

    const occupationFile = fs.readFileSync(path.join(__dirname, 'raw/03_occupation_data.sql'), 'utf8');
    db.exec(occupationFile, (err) => {
      if (err) progress.fail('Occupation data', err);
      else progress.done('Occupation data loaded');
    });

    console.log('Now loading interests table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS interests (
        onetsoc_code CHARACTER(10) NOT NULL,
        element_id CHARACTER VARYING(20) NOT NULL,
        scale_id CHARACTER VARYING(3) NOT NULL,
        data_value DECIMAL(5,2) NOT NULL,
        date_updated DATE NOT NULL,
        domain_source CHARACTER VARYING(30) NOT NULL,
        FOREIGN KEY (onetsoc_code) REFERENCES occupation_data(onetsoc_code)
      )
    `, (err) => { if (err) progress.fail('interests table', err) });

    console.log('Now loading F2Collected table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS F2Collected (
      onetsoc_code CHARACTER(10) NOT NULL,
      title CHARACTER VARYING(150) NOT NULL,
      R DECIMAL(5,2) NOT NULL DEFAULT 0,
      I DECIMAL(5,2) NOT NULL DEFAULT 0,
      A DECIMAL(5,2) NOT NULL DEFAULT 0,
      S DECIMAL(5,2) NOT NULL DEFAULT 0,
      E DECIMAL(5,2) NOT NULL DEFAULT 0,
      C DECIMAL(5,2) NOT NULL DEFAULT 0,
      PRIMARY KEY (onetsoc_code),
      FOREIGN KEY (onetsoc_code) REFERENCES occupation_data(onetsoc_code)
    )`, (err) => { if (err) progress.fail('F2Collected table', err) });

    const interestsFile = fs.readFileSync(path.join(__dirname, 'raw/13_interests.sql'), 'utf8');
    db.exec(interestsFile, (err) => {
      if (err) {
        progress.fail('Interests data', err);
      } else {
        progress.done('Interests data loaded');

        db.run(`
          CREATE TABLE IF NOT EXISTS AdaptedCareers (
            onetsoc_code CHARACTER(10) NOT NULL,
            title CHARACTER VARYING(150) NOT NULL,
            R DECIMAL(5,2) NOT NULL DEFAULT 0,
            I DECIMAL(5,2) NOT NULL DEFAULT 0,
            A DECIMAL(5,2) NOT NULL DEFAULT 0,
            S DECIMAL(5,2) NOT NULL DEFAULT 0,
            E DECIMAL(5,2) NOT NULL DEFAULT 0,
            C DECIMAL(5,2) NOT NULL DEFAULT 0,
            PRIMARY KEY (onetsoc_code)
          )
        `, (err) => {
          if (err) return progress.fail('AdaptedCareers table', err);
          progress.done('AdaptedCareers table created');

          db.run(`
            INSERT INTO AdaptedCareers (onetsoc_code, title, R, I, A, S, E, C)
            SELECT
              o.onetsoc_code,
              o.title,
              MAX(CASE WHEN i.element_id = '1.B.1.a' THEN i.data_value ELSE 0 END) as R,
              MAX(CASE WHEN i.element_id = '1.B.1.b' THEN i.data_value ELSE 0 END) as I,
              MAX(CASE WHEN i.element_id = '1.B.1.c' THEN i.data_value ELSE 0 END) as A,
              MAX(CASE WHEN i.element_id = '1.B.1.d' THEN i.data_value ELSE 0 END) as S,
              MAX(CASE WHEN i.element_id = '1.B.1.e' THEN i.data_value ELSE 0 END) as E,
              MAX(CASE WHEN i.element_id = '1.B.1.f' THEN i.data_value ELSE 0 END) as C
            FROM interests i
            JOIN occupation_data o ON i.onetsoc_code = o.onetsoc_code
            GROUP BY i.onetsoc_code
          `, (err) => {
            if (err) progress.fail('AdaptedCareers population', err);
            else progress.done('AdaptedCareers populated');
          });
        });
      }
    });
  });
}