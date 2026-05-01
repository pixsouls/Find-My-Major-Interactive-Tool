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