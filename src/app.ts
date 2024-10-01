import express, { Request, Response } from "express";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

type Task = {
  id: number;
  name: string;
  status: string;
};

const TASKS: Task[] = [
  { id: 1, name: "First Task", status: "pending" },
  { id: 2, name: "Second Task", status: "pending" },
  { id: 3, name: "Third Task", status: "pending" },
];

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

app.get("/next/:index", (req: Request, res: Response) => {
  const taskIndex = parseInt(req.params.index);
  console.log(`Task Requested. Index: ${taskIndex}`);
  const task = taskIndex < TASKS.length ? TASKS[taskIndex] : null;

  if (task) {
    res.render("components/task", { taskIndex, taskName: task.name });
  } else {
    res.render("components/finished");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
