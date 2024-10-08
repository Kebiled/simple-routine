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
import {
  createUserRoutine,
  getAllRoutineTasks,
  getUserRoutine,
} from "./util/sqlite";

const app = express();
const port = process.env.PORT || 3000;

// TODO: auth
const USER_ID = "TEST_ID";

type Task = {
  id: number;
  name: string;
  status: string;
};

// TODO: move to db
const TASKS: Task[] = [
  { id: 1, name: "First Task", status: "pending" },
  { id: 2, name: "Second Task", status: "pending" },
  { id: 3, name: "Third Task", status: "pending" },
];

function renderNextTask(taskIndex: number | undefined, res: Response) {
  const task =
    (taskIndex || taskIndex === 0) && taskIndex < TASKS.length
      ? TASKS[taskIndex]
      : null;
  if (task) {
    res.render("components/task", { taskIndex, taskName: task.name });
  } else {
    res.render("components/finished");
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
    let userRoutine = await getUserRoutine(USER_ID);
    if (!userRoutine) {
      await createUserRoutine(USER_ID);
      userRoutine = await getUserRoutine(USER_ID);
      if (!userRoutine) {
        throw new Error("Failed to get user routine after creation");
      }
    }
    const tasks = await getAllRoutineTasks(userRoutine.id);
    console.log(tasks);
    // TODO: link above with below
    renderNextTask(0, res);
  } catch (err) {
    next(err);
  }
});

app.post("/task/completed/:taskIndex", (req: Request, res: Response) => {
  const currentTaskId = parseInt(req.params.taskIndex);
  console.log("Task completed:", currentTaskId);
  // TODO: mark completed
  renderNextTask(currentTaskId + 1, res);
});

app.post("/task/skipped/:taskIndex", (req: Request, res: Response) => {
  const currentTaskId = parseInt(req.params.taskIndex);
  console.log("Task skipped:", currentTaskId);
  // TODO: mark skipped
  renderNextTask(currentTaskId + 1, res);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
