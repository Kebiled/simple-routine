export type SqlTaskType = {
  id: number;
  routine_id: number;
  description: string;
  status: TASK_STATUS;
  task_order: number;
};

export type SqlRoutineType = {
  id: number;
  user_id: string;
  datetime_last_edited: number;
  total_completed: number;
  total_skipped: number;
};

export type SqlUserType = {
  id: string;
  name: string;
};

export enum TASK_STATUS {
  COMPLETED = "COMPLETED",
  PENDING = "PENDING",
  SKIPPED = "SKIPPED",
}
