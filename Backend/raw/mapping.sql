/* 
step1: have postgres installed and running on your machine
step2: create a database named mapping_db: createdb mapping_db
step3: connect to mapping_db in psql and run this file: psql -d mapping_db -f mapping.sql
step4: load occupation data: psql -d mapping_db -f occupational_data.sql
step5: import 3 csv files (majors.csv, interests.csv, and career_to_major_mapping.csv) located in Backend/data folder:
    5.1:\copy majors(major_name) FROM 'path/to/majors.csv' DELIMITER ',' CSV HEADER;
    5.2:\copy interests(onetsoc_code, element_name, scale_id, data_value) FROM 'path/to/interests.csv' DELIMITER ',' CSV HEADER;
    5.3:\copy mapping_staging(major_id, onetsoc_code, match_strength) FROM 'path/to/career_to_major_mapping.csv' DELIMITER ',' CSV HEADER;
 */
CREATE TABLE occupation_data (
    onetsoc_code VARCHAR(20) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE majors (
    id SERIAL PRIMARY KEY,
    major_name VARCHAR(255) NOT NULL
);

CREATE TABLE mapping (
    major_id INT REFERENCES majors(id),
    onetsoc_code VARCHAR(20) REFERENCES occupation_data(onetsoc_code),
    match_strength DECIMAL(3, 2),
    PRIMARY KEY (major_id, onetsoc_code)
);

CREATE INDEX idx_major_mapping ON mapping(major_id);
CREATE INDEX idx_occupation_mapping ON mapping(onetsoc_code);