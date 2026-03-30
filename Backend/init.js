const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// helper functions

// Connect
const db = new sqlite3.Database(path.join(__dirname, 'test.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) return console.error(err.message);
})

db.serialize(() => {
  // Create interests table
  db.run(`
    CREATE TABLE IF NOT EXISTS interests (
      onetsoc_code CHARACTER(10) NOT NULL,
      element_id CHARACTER VARYING(20) NOT NULL,
      scale_id CHARACTER VARYING(3) NOT NULL,
      data_value DECIMAL(5,2) NOT NULL,
      date_updated DATE NOT NULL,
      domain_source CHARACTER VARYING(30) NOT NULL,
      FOREIGN KEY (onetsoc_code) REFERENCES occupation_data(onetsoc_code),
      FOREIGN KEY (element_id) REFERENCES content_model_reference(element_id),
      FOREIGN KEY (scale_id) REFERENCES scales_reference(scale_id)
    )
  `, (err) => { if (err) console.error(err.message) });

  // Load interests data from SQL file
  const interestsFile = fs.readFileSync(path.join(__dirname, 'raw/13_interests.sql'), 'utf8');
  db.exec(interestsFile, (err) => {
    if (err) console.error(err.message);
    else console.log('Interests SQL file loaded successfully');
  });
});


db.serialize(() => {
  // Create interests table
  db.run(`
    CREATE TABLE IF NOT EXISTS occupation_data (
      onetsoc_code CHARACTER(10) NOT NULL,
      title CHARACTER VARYING(150) NOT NULL,
      description CHARACTER VARYING(1000) NOT NULL,
      PRIMARY KEY (onetsoc_code)
    )
  `, (err) => { if (err) console.error(err.message) });

    const interestsFile = fs.readFileSync(path.join(__dirname, 'raw/03_occupation_data.sql'), 'utf8');
    db.exec(interestsFile, (err) => {
    if (err) console.error(err.message);
    else console.log('Interests SQL file loaded successfully');
  });
});