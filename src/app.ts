/*
 * TODO:
 * - auth
 * - user timezones
 * - routine active hours
 * - stats (current routine)
 * - stats (all time)
 * - async handler (https://zellwk.com/blog/async-await-express/)
 * - express error handler (see above)
 * - db open/close wrapper OR pooling
 * - log files
 * - logging (refactor console logs)
 */

import express, { NextFunction, Request, Response } from "express";
import path from "path";
import Redis from "ioredis";

import {
  createUserRoutine,
  getAllRoutineTasks,
  getUserRoutine,
  resetAllRoutineTasksToPending,
  updateTaskStatus,
} from "./util/sqlite";
import { SqlRoutineType, SqlTaskType, TASK_STATUS } from "./types/sqlite";

const app = express();
const port = process.env.PORT || 3000;

const redis = new Redis({
  host: "localhost",
  port: 6379,
});

// TODO: auth
const USER_ID = "TEST_ID";

async function renderNextTask(
  taskIndex: number | undefined,
  res: Response,
  userId: string
) {
  const { tasks, routine } = await getUserDataRedis(userId);

  if (!tasks || !routine) {
    throw new Error("No tasks to render");
  }

  const currentStats = {
    completed: `${tasks.reduce(
      (prev, curr) => (prev += curr.status === TASK_STATUS.COMPLETED ? 1 : 0),
      0
    )}/${tasks.length}`,
    skipped: `${tasks.reduce(
      (prev, curr) => (prev += curr.status === TASK_STATUS.SKIPPED ? 1 : 0),
      0
    )}/${tasks.length}`,
  };

  const task =
    (taskIndex || taskIndex === 0) && taskIndex < tasks.length
      ? tasks[taskIndex]
      : undefined;
  if (task) {
    res.render("components/task", {
      taskIndex,
      taskName: task.description,
      completed: currentStats.completed,
      skipped: currentStats.skipped,
    });
  } else {
    res.render("components/finished", {
      totalCompleted: routine.total_completed,
      totalSkipped: routine.total_skipped,
    });
  }
}

async function updateTask(
  taskIndex: number,
  userId: string,
  status: TASK_STATUS
) {
  const userData = await getUserDataRedis(userId);
  if (!userData.tasks) {
    throw new Error("No tasks found when attempting to update");
  }
  const task = userData.tasks[taskIndex];
  if (!task) {
    throw new Error("No task found with task index when attempting to update");
  }

  userData.tasks[taskIndex] = { ...task, status: status };
  userData.routine.datetime_last_edited = new Date().getTime();
  userData.routine.total_skipped += status === TASK_STATUS.SKIPPED ? 1 : 0;
  userData.routine.total_completed += status === TASK_STATUS.COMPLETED ? 1 : 0;

  await updateTaskStatus(task.id, task.routine_id, status);
  await redis.set(userId, JSON.stringify(userData), "EX", 3600);
  console.log(`Updated taskId: ${task.id} - with status: ${status}`);
}

async function getUserDataRedis(userId: string) {
  const userDataJSON = await redis.get(userId);
  let userRoutine;
  if (!userDataJSON) {
    const userRoutineSql = await getUserRoutine(userId);
    if (!userRoutineSql) throw new Error("No routine found"); // TODO: handle user not having a routine
    const userTasksSql = await getAllRoutineTasks(userRoutineSql.id);
    if (!userTasksSql) throw new Error("No tasks found");
    await redis.set(
      userId,
      JSON.stringify({ routine: userRoutineSql, tasks: userTasksSql }),
      "EX",
      3600
    );
    userRoutine = { routine: userRoutineSql, tasks: userTasksSql };
  } else {
    userRoutine = await JSON.parse(userDataJSON);
  }
  return userRoutine as { routine: SqlRoutineType; tasks: SqlTaskType[] }; // TODO: dont like casting like this with no validations
}

async function getBeginningTaskIndex(userId: string) {
  const userData = await getUserDataRedis(userId);
  if (!userData.routine || !userData.tasks) {
    throw new Error("No routine or tasks found while getting first task");
  }
  const routineLastEdited = new Date(userData.routine.datetime_last_edited);
  const currentDate = new Date();
  routineLastEdited.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  const dayDifference = Math.floor(
    (currentDate.getTime() - routineLastEdited.getTime()) /
      (1000 * 60 * 60 * 24)
  );
  console.log("Days since last edited:", dayDifference);
  if (dayDifference > 0) {
    // TODO: set total_skipped in db to amountofdays * tasks.length - numberCurrentlyMarkedCompleted
    await resetAllRoutineTasksToPending(userData.routine.id);
    await redis.set(
      userId,
      JSON.stringify({
        ...userData,
        tasks: userData.tasks.map((task) => {
          return { ...task, status: TASK_STATUS.PENDING };
        }),
      }),
      "EX",
      3600
    );
    return 0;
  } else {
    const index = userData.tasks.findIndex((task) => task.status === "PENDING");
    return index !== -1 ? index : userData.tasks.length;
  }
}

app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.all("/*", (req: Request, res: Response, next) => {
  console.log(`Request made to ${req.path}`);
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.render("index");
});

app.get("/begin", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await redis.del(USER_ID);
    const taskIndex = await getBeginningTaskIndex(USER_ID);
    renderNextTask(taskIndex, res, USER_ID);
  } catch (err) {
    next(err);
  }
});

app.post(
  "/task/completed/:taskIndex",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentTaskId = parseInt(req.params.taskIndex);
      await updateTask(currentTaskId, USER_ID, TASK_STATUS.COMPLETED);
      renderNextTask(currentTaskId + 1, res, USER_ID);
    } catch (err) {
      next(err);
    }
  }
);

app.post(
  "/task/skipped/:taskIndex",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentTaskId = parseInt(req.params.taskIndex);
      await updateTask(currentTaskId, USER_ID, TASK_STATUS.SKIPPED);
      renderNextTask(currentTaskId + 1, res, USER_ID);
    } catch (err) {
      next(err);
    }
  }
);

app.post(
  "/admin/reset-routine",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData = await getUserDataRedis(USER_ID);
      await resetAllRoutineTasksToPending(userData.routine.id);
    } catch (err) {
      next(err);
    }
  }
);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
