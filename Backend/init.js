const sqlite3 = require('sqlite3').verbose();
let sql;

// Connect
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'test.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) return console.error(err.message);
})

// Create table
sql = `
  CREATE TABLE rawONETData(
  SOC_code STRING KEY NOT NULL,
  title STRING NOT NULL,
  elementID STRING,
  elementName STRING NOT NULL,
  dateLastUpdated STRING
)`
db.run(sql)

sql = `
  CREATE TABLE ONETScoresAdapted(
  DominantValue ENUM(RIASEC)
  )
`
// Drop table