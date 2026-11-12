import { randomUUID } from "node:crypto";
import { database } from "@/lib/server/database";
import {
  errorResponse,
  getRequestUser,
  isRecord,
  jsonResponse,
  readJson,
  unauthorizedResponse,
} from "@/lib/server/api";
import { isValidDateOnly, taskFromRow, validateTaskInput, type TaskRow } from "@/lib/tasks";

const sortOptions: Record<string, string> = {
  deadline: "due_date IS NULL, due_date ASC, created_at DESC",
  priority: "CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END, due_date IS NULL, due_date ASC",
  title: "title COLLATE NOCASE ASC",
  created: "created_at DESC",
  updated: "updated_at DESC",
};

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();

    const url = new URL(request.url);
    const where = ["user_id = ?"];
    const values: (string | number)[] = [user.id];
    const search = url.searchParams.get("search")?.trim();
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const category = url.searchParams.get("category");
    const dueFrom = url.searchParams.get("dueFrom");
    const dueTo = url.searchParams.get("dueTo");
    const sortValue = url.searchParams.get("sort");

    if (status && status !== "All" && !["Pending", "In Progress", "Completed"].includes(status)) {
      return errorResponse("INVALID_STATUS", "Choose a valid task status filter.", 400);
    }
    if (priority && priority !== "All" && !["High", "Medium", "Low"].includes(priority)) {
      return errorResponse("INVALID_PRIORITY", "Choose a valid priority filter.", 400);
    }
    if ((dueFrom && !isValidDateOnly(dueFrom)) || (dueTo && !isValidDateOnly(dueTo)) || (dueFrom && dueTo && dueFrom > dueTo)) {
      return errorResponse("INVALID_DATE_RANGE", "Provide a valid due-date range.", 400);
    }
    if (sortValue && !sortOptions[sortValue]) {
      return errorResponse("INVALID_SORT", "Choose a supported task sort order.", 400);
    }

    if (search) {
      where.push("(title LIKE ? OR description LIKE ?)");
      values.push(`%${search.slice(0, 120)}%`, `%${search.slice(0, 120)}%`);
    }
    if (status && status !== "All") {
      where.push("status = ?");
      values.push(status);
    }
    if (priority && priority !== "All") {
      where.push("priority = ?");
      values.push(priority);
    }
    if (category && category !== "All") {
      where.push("category = ?");
      values.push(category);
    }
    if (dueFrom) {
      where.push("due_date >= ?");
      values.push(dueFrom);
    }
    if (dueTo) {
      where.push("due_date <= ?");
      values.push(dueTo);
    }

    const sort = sortOptions[sortValue ?? "deadline"];
    const requestedLimit = Number(url.searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 100;
    const rows = database
      .prepare(`SELECT * FROM tasks WHERE ${where.join(" AND ")} ORDER BY ${sort} LIMIT ?`)
      .all(...values, limit) as TaskRow[];

    return jsonResponse({ tasks: rows.map(taskFromRow), count: rows.length });
  } catch {
    return errorResponse("TASKS_READ_FAILED", "Tasks could not be loaded.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();

    const body = await readJson(request);
    if (!isRecord(body)) {
      return errorResponse("INVALID_BODY", "Send a JSON task object.", 400);
    }
    const validation = validateTaskInput(body);
    if (!validation.input) {
      return errorResponse("INVALID_TASK", validation.error ?? "Task details are invalid.", 400);
    }

    const input = validation.input;
    const id = randomUUID();
    const now = new Date().toISOString();
    const status = input.status ?? "Pending";
    const progress = status === "Completed" ? 100 : input.progress ?? 0;
    const completedAt = status === "Completed" ? now : null;

    const create = database.transaction(() => {
      database.prepare(`
        INSERT INTO tasks (
          id, user_id, title, description, category, priority, status,
          due_date, planned_minutes, actual_minutes, progress, completed_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        user.id,
        input.title,
        input.description,
        input.category,
        input.priority,
        status,
        input.dueDate,
        input.plannedMinutes,
        input.actualMinutes,
        progress,
        completedAt,
        now,
        now
      );
      database.prepare(`
        INSERT INTO task_activity (id, user_id, task_id, task_title, action, created_at)
        VALUES (?, ?, ?, ?, 'created', ?)
      `).run(randomUUID(), user.id, id, input.title, now);
      return database.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, user.id) as TaskRow;
    });

    return jsonResponse({ task: taskFromRow(create()) }, 201);
  } catch {
    return errorResponse("TASK_CREATE_FAILED", "The task could not be created.", 500);
  }
}
