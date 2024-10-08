export type SqlTaskType = {
  id: number;
  routine_id: number;
  description: string;
  status: "PENDING" | "COMPLETED";
  task_order: number;
};

export type SqlRoutineType = {
  id: number;
  user_id: string;
  datetime_last_edited: number;
};

export type SqlUserType = {
  id: string;
  name: string;
};
