/*
 * TODO:
 * - auth
 * - user timezones
 * - db -> redis
 * - redis -> task handling
 * - async handler (https://zellwk.com/blog/async-await-express/)
 * - express error handler (see above)
 * - db open/close wrapper
 */

import express, { NextFunction, Request, Response } from "express";
import path from "path";
import Redis from "ioredis";

import {
  createUserRoutine,
  getAllRoutineTasks,
  getUserRoutine,
  updateTaskStatus,
} from "./util/sqlite";
import { SqlRoutineType, SqlTaskType } from "./types/sqlite";

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
  const userData = await getUserRoutineRedis(userId);
  const tasks = userData.tasks;

  if (!tasks) {
    throw new Error("No tasks to render");
  }
  const task =
    (taskIndex || taskIndex === 0) && taskIndex < tasks.length
      ? tasks[taskIndex]
      : undefined;
  if (task) {
    res.render("components/task", { taskIndex, taskName: task.description });
  } else {
    res.render("components/finished");
  }
}

async function updateTask(
  taskIndex: number,
  userId: string,
  status: "PENDING" | "COMPLETED"
) {
  const userData = await getUserRoutineRedis(userId);
  if (!userData.tasks) {
    throw new Error("No tasks found when attempting to update");
  }
  const task = userData.tasks[taskIndex];
  if (!task) {
    throw new Error("No task found with task index when attempting to update");
  }
  userData.tasks[taskIndex] = { ...task, status: status };
  await updateTaskStatus(task.id, status);
  await redis.set(userId, JSON.stringify(userData), "EX", 3600);
  console.log(`Updated taskId: ${task.id} - with status: ${status}`);
}

// TODO: refactor
async function getUserRoutineRedis(userId: string) {
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
    console.log("USED SQL");
  } else {
    console.log("USED REDIS");
    userRoutine = await JSON.parse(userDataJSON);
  }
  return userRoutine as { routine: SqlRoutineType; tasks: SqlTaskType[] }; // TODO: dont like casting like this with no validations
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
    const userData = await getUserRoutineRedis(USER_ID);
    console.log(userData);
    renderNextTask(0, res, USER_ID);
  } catch (err) {
    next(err);
  }
});

app.post(
  "/task/completed/:taskIndex",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentTaskId = parseInt(req.params.taskIndex);
      console.log("Task completed:", currentTaskId);
      // TODO: mark completed
      await updateTask(currentTaskId, USER_ID, "COMPLETED");
      renderNextTask(currentTaskId + 1, res, USER_ID);
    } catch (err) {
      next(err);
    }
  }
);

app.post("/task/skipped/:taskIndex", (req: Request, res: Response) => {
  const currentTaskId = parseInt(req.params.taskIndex);
  console.log("Task skipped:", currentTaskId);
  // TODO: mark skipped
  renderNextTask(currentTaskId + 1, res, USER_ID);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
