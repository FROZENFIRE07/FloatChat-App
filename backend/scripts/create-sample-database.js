const Database = require('better-sqlite3');
const path = require('path');

const databasePath = path.resolve(__dirname, '../../argo_database.db');
const database = new Database(databasePath);

database.exec(`
  DROP TABLE IF EXISTS argo_profiles;
  DROP TABLE IF EXISTS argo_floats;

  CREATE TABLE argo_floats (
    float_id TEXT PRIMARY KEY,
    first_timestamp TEXT,
    last_timestamp TEXT,
    last_latitude REAL,
    last_longitude REAL,
    total_profiles INTEGER
  );

  CREATE TABLE argo_profiles (
    id INTEGER,
    float_id TEXT,
    timestamp TEXT,
    latitude REAL,
    longitude REAL,
    depth REAL,
    temperature REAL,
    salinity REAL,
    pressure REAL
  );
`);

database.prepare(`
  INSERT INTO argo_floats
    (float_id, first_timestamp, last_timestamp, last_latitude, last_longitude, total_profiles)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('sample-001', '2024-01-15T12:00:00Z', '2024-01-15T12:00:00Z', 18.5, 66.2, 1);

database.prepare(`
  INSERT INTO argo_profiles
    (id, float_id, timestamp, latitude, longitude, depth, temperature, salinity, pressure)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(1, 'sample-001', '2024-01-15T12:00:00Z', 18.5, 66.2, 10, 27.4, 35.6, 10);

database.close();
console.log(`Created one-sample ARGO database at ${databasePath}`);