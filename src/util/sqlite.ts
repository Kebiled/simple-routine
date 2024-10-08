import sqlite3 from "sqlite3";
import { SqlRoutineType, SqlTaskType, SqlUserType } from "../types/sqlite";

const getUserRoutineSql = `
	SELECT routine.id, datetime_last_edited
	FROM routine
	JOIN user
		ON routine.user_id = user.id
	WHERE routine.user_id = ?;
`;

const getAllRoutineTasksSql = `
	SELECT description, status, task_order
	FROM task
	WHERE routine_id = ?
	ORDER BY task_order ASC;
`;

const createUserRoutineSql = `
	INSERT INTO routine (user_id, datetime_last_edited)
	VALUES (?, ?);
`;

const createUserSql = `
	INSERT INTO user (id, name)
	VALUES (?, ?);
`;

const createTaskSql = `
	INSERT INTO task (routine_id, description, status, task_order)
	VALUES (?, ?, ?, ?);
`;

export function getDatabase() {
  return new sqlite3.Database(
    "./db/simple_routine.db",
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log("Connected to simple_routine database.");
    }
  );
}

export function closeDatabase(db: sqlite3.Database) {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Closing the database connection.");
  });
}

export async function createUserRoutine(userId: string) {
  const db = getDatabase();
  console.log("Creating user routine");
  await new Promise<void>((resolve, reject) => {
    db.run(createUserRoutineSql, [userId, new Date()], (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
  closeDatabase(db);
}

export async function getUserRoutine(
  userId: string
): Promise<SqlRoutineType | undefined> {
  const db = getDatabase();
  console.log("Attempting to get routine for user", userId);
  const row = await new Promise((resolve, reject) => {
    db.get(getUserRoutineSql, [userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

  closeDatabase(db);

  console.log("Have routine for user", userId);
  return row as SqlRoutineType | undefined;
}

export async function createUser(userId: string, name: string) {
  const db = getDatabase();
  console.log("Creating user");
  await new Promise<void>((resolve, reject) => {
    db.run(createUserSql, [userId, name], (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
  closeDatabase(db);
}

export async function createTask(
  routineId: number,
  description: string,
  taskOrder: number
) {
  const db = getDatabase();
  console.log("Creating task");
  await new Promise<void>((resolve, reject) => {
    db.run(
      createTaskSql,
      [routineId, description, "pending", taskOrder],
      (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      }
    );
  });
  closeDatabase(db);
}

export async function getAllRoutineTasks(
  routineId: number
): Promise<SqlTaskType[] | undefined> {
  const db = getDatabase();
  console.log("Getting tasks for routine", routineId);
  const rows = await new Promise((resolve, reject) => {
    db.all(getAllRoutineTasksSql, [routineId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
  console.log("Have tasks for routine", routineId);
  return rows as SqlTaskType[] | undefined;
}
