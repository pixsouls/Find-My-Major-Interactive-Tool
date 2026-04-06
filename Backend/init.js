//
// THIS FILE IS FOR SETTING UP THE DATA BASE WITH THE DATA IN /Backend/raw/
//
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Connect
const db = new sqlite3.Database(path.join(__dirname, 'test.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) return console.error(err.message);
});

db.serialize(() => {
  // occupation_data
  console.log('Now loading occupation_data table...');
  db.run(`
    CREATE TABLE IF NOT EXISTS occupation_data (
      onetsoc_code CHARACTER(10) NOT NULL,
      title CHARACTER VARYING(150) NOT NULL,
      description CHARACTER VARYING(1000) NOT NULL,
      PRIMARY KEY (onetsoc_code)
    )
  `, (err) => { if (err) console.error(err.message) });

  const occupationFile = fs.readFileSync(path.join(__dirname, 'raw/03_occupation_data.sql'), 'utf8');
  db.exec(occupationFile, (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Occupation data loaded successfully');
    }
  });

  // interests
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
  `, (err) => { if (err) console.error(err.message) });

  const interestsFile = fs.readFileSync(path.join(__dirname, 'raw/13_interests.sql'), 'utf8');
  db.exec(interestsFile, (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Interests data loaded successfully');

      // AdaptedCareers — nested here to ensure interests is fully loaded first
      console.log('Now loading AdaptedCareers table...');
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
        if (err) return console.error(err.message);
        console.log('AdaptedCareers table created successfully');

        console.log('Now populating AdaptedCareers...');
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
          if (err) console.error(err.message);
          else console.log('AdaptedCareers populated successfully');
        });
      });
    }
  });
});