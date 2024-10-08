import sqlite3 from "sqlite3";
import { SqlRoutineType, SqlTaskType, SqlUserType } from "../types/sqlite";

const getUserRoutineSql = `
	SELECT routine.id, datetime_last_edited
	FROM routine
	JOIN user
		ON routine.user_id = user.id
	WHERE routine.user_id = $userId;
`;

const getAllRoutineTasksSql = `
	SELECT description, status, task_order
	FROM task
	WHERE routine_id = $routineId
	ORDER BY task_order ASC;
`;

const createUserRoutineSql = `
	INSERT INTO routine (user_id, datetime_last_edited)
	VALUES ($userId, $datetimeLastEdited);
`;

const createUserSql = `
	INSERT INTO user (id, name)
	VALUES ($id, $name);
`;

const createTaskSql = `
	INSERT INTO task (routine_id, description, status, task_order)
	VALUES ($routineId, $description, $status, $taskOrder);
`;

const updateTaskStatusSql = `
	UPDATE task
	SET status = $status
	WHERE task.id = $taskId
`;

export function getDatabase() {
  return new sqlite3.Database(
    "./db/simple_routine.db",
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err) => {
      if (err) {
        console.error(err.message);
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

export async function runVoidDBOperation(
  sqlString: string,
  sqlParams: Object,
  db: sqlite3.Database
) {
  await new Promise<void>((resolve, reject) => {
    db.run(sqlString, { ...sqlParams }, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

export async function createUserRoutine(userId: string) {
  const db = getDatabase();
  console.log("Creating user routine");
  await runVoidDBOperation(
    createUserRoutineSql,
    { $userId: userId, $datetimeLastEdited: new Date() },
    db
  );
  closeDatabase(db);
}

export async function getUserRoutine(
  userId: string
): Promise<SqlRoutineType | undefined> {
  const db = getDatabase();
  console.log("Attempting to get routine for user", userId);
  const row = await new Promise<SqlRoutineType | undefined>(
    (resolve, reject) => {
      db.get(getUserRoutineSql, { $userId: userId }, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? (row as SqlRoutineType) : undefined);
        }
      });
    }
  );

  closeDatabase(db);

  console.log("Have routine for user", userId);
  return row;
}

export async function createUser(userId: string, name: string) {
  const db = getDatabase();
  console.log("Creating user");
  await runVoidDBOperation(createUserSql, { $id: userId, $name: name }, db);
  closeDatabase(db);
}

export async function createTask(
  routineId: number,
  description: string,
  taskOrder: number
) {
  const db = getDatabase();
  console.log("Creating task");
  await runVoidDBOperation(
    createTaskSql,
    {
      $routineId: routineId,
      $description: description,
      $status: "pending",
      $taskOrder: taskOrder,
    },
    db
  );
  closeDatabase(db);
}

export async function getAllRoutineTasks(
  routineId: number
): Promise<SqlTaskType[] | undefined> {
  const db = getDatabase();
  console.log("Getting tasks for routine", routineId);
  const rows = await new Promise<SqlTaskType[] | undefined>(
    (resolve, reject) => {
      db.all(getAllRoutineTasksSql, { $routineId: routineId }, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows ? (rows as SqlTaskType[]) : undefined);
        }
      });
    }
  );
  console.log("Have tasks for routine", routineId);
  return rows;
}

export async function updateTaskStatus(
  taskId: number,
  status: "PENDING" | "COMPLETED"
) {
  const db = getDatabase();
  console.log("Updating task", taskId);
  await runVoidDBOperation(
    createTaskSql,
    {
      $taskId: taskId,
      $status: status,
    },
    db
  );
  closeDatabase(db);
  console.log("Task updated", taskId);
}
