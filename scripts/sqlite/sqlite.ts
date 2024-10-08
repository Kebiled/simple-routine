import { getDatabase, closeDatabase } from "../../src/util/sqlite";

const db = getDatabase();

function initDatabase() {
  console.log("Creating tables...");
  db.serialize(() => {
    db.exec(`
      CREATE TABLE user(
        id TEXT PRIMARY KEY,
        name TEXT
      )
      `);
    db.exec(`
      CREATE TABLE routine(
        id INTEGER PRIMARY KEY,
        user_id TEXT,
        datetime_last_edited DATETIME
      )
      `);
    db.exec(`
      CREATE TABLE task(
        id INTEGER PRIMARY KEY,
        routine_id INTEGER,
        description TEXT,
        status TEXT,
        task_order INTEGER
      )
      `);
  });
  console.log("Tables created.");
}

function clearDatabase() {
  console.log("Dropping tables...");
  db.serialize(() => {
    db.exec("DROP TABLE user");
    db.exec("DROP TABLE routine");
    db.exec("DROP TABLE task");
  });
  console.log("Tables dropped.");
}

function resetDatabase() {
  console.log("Resetting database...");
  clearDatabase();
  initDatabase();
  console.log("Database reset.");
}

function main() {
  resetDatabase();
  console.log("Done.");
}

main();

closeDatabase(db);
