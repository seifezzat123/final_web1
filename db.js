const sqlite = require('sqlite3');
const db = new sqlite.Database('3alegny.db');


// New User Table
const createUserTable = `CREATE TABLE IF NOT EXISTS USER (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  EMAIL TEXT UNIQUE NOT NULL,
  ROLE TEXT NOT NULL,
  PASSWORD TEXT NOT NULL
)`;


module.exports = {
  db,
  createUserTable,
};