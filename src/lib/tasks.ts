export type TaskPriority = "High" | "Medium" | "Low";
export type TaskStatus = "Pending" | "In Progress" | "Completed";

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  plannedMinutes: number;
  actualMinutes: number;
  progress: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  planned_minutes: number;
  actual_minutes: number;
  progress: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  plannedMinutes: number;
  actualMinutes: number;
  progress: number;
}

export function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    plannedMinutes: row.planned_minutes,
    actualMinutes: row.actual_minutes,
    progress: row.progress,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const priorities: TaskPriority[] = ["High", "Medium", "Low"];
const statuses: TaskStatus[] = ["Pending", "In Progress", "Completed"];
const allowedFields = new Set([
  "title",
  "description",
  "category",
  "priority",
  "status",
  "dueDate",
  "plannedMinutes",
  "actualMinutes",
  "progress",
]);

export function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateTaskInput(
  value: Record<string, unknown>,
  partial = false
): { input?: Partial<TaskInput>; error?: string } {
  const keys = Object.keys(value);

  if (keys.some((key) => !allowedFields.has(key))) {
    return { error: "The task contains an unsupported field." };
  }
  if (partial && keys.length === 0) {
    return { error: "Provide at least one task field to update." };
  }
  if (!partial && (typeof value.title !== "string" || !value.title.trim())) {
    return { error: "A task title is required." };
  }

  const input: Partial<TaskInput> = {};

  if ("title" in value) {
    if (typeof value.title !== "string" || !value.title.trim() || value.title.trim().length > 120) {
      return { error: "Task titles must contain 1 to 120 characters." };
    }
    input.title = value.title.trim();
  }

  if ("description" in value) {
    if (typeof value.description !== "string" || value.description.length > 2000) {
      return { error: "Descriptions must be 2,000 characters or fewer." };
    }
    input.description = value.description.trim();
  }

  if ("category" in value) {
    if (typeof value.category !== "string" || !value.category.trim() || value.category.trim().length > 50) {
      return { error: "Categories must contain 1 to 50 characters." };
    }
    input.category = value.category.trim();
  }

  if ("priority" in value) {
    if (typeof value.priority !== "string" || !priorities.includes(value.priority as TaskPriority)) {
      return { error: "Choose High, Medium, or Low priority." };
    }
    input.priority = value.priority as TaskPriority;
  }

  if ("status" in value) {
    if (typeof value.status !== "string" || !statuses.includes(value.status as TaskStatus)) {
      return { error: "Choose Pending, In Progress, or Completed status." };
    }
    input.status = value.status as TaskStatus;
  }

  if ("dueDate" in value) {
    if (value.dueDate !== null && (typeof value.dueDate !== "string" || !isValidDateOnly(value.dueDate))) {
      return { error: "Due dates must use YYYY-MM-DD format or be null." };
    }
    input.dueDate = value.dueDate as string | null;
  }

  for (const field of ["plannedMinutes", "actualMinutes", "progress"] as const) {
    if (field in value) {
      const number = value[field];
      const max = field === "progress" ? 100 : 60000;
      if (typeof number !== "number" || !Number.isInteger(number) || number < 0 || number > max) {
        return { error: `${field} must be a whole number from 0 to ${max}.` };
      }
      input[field] = number;
    }
  }

  if (!partial) {
    input.description ??= "";
    input.category ??= "Study";
    input.priority ??= "Medium";
    input.status ??= "Pending";
    input.dueDate ??= null;
    input.plannedMinutes ??= 0;
    input.actualMinutes ??= 0;
    input.progress ??= input.status === "Completed" ? 100 : 0;
  }

  return { input };
}
