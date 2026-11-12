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
import { taskFromRow, validateTaskInput, type TaskRow } from "@/lib/tasks";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    const { id } = await params;
    const row = database.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, user.id) as TaskRow | undefined;
    if (!row) return errorResponse("TASK_NOT_FOUND", "Task not found.", 404);
    return jsonResponse({ task: taskFromRow(row) });
  } catch {
    return errorResponse("TASK_READ_FAILED", "The task could not be loaded.", 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    const { id } = await params;
    const current = database.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, user.id) as TaskRow | undefined;
    if (!current) return errorResponse("TASK_NOT_FOUND", "Task not found.", 404);

    const body = await readJson(request);
    if (!isRecord(body)) {
      return errorResponse("INVALID_BODY", "Send a JSON object with task fields.", 400);
    }
    const validation = validateTaskInput(body, true);
    if (!validation.input) {
      return errorResponse("INVALID_TASK", validation.error ?? "Task details are invalid.", 400);
    }

    const input = validation.input;
    const updates: [string, string | number | null][] = [];
    const columns: Record<string, string> = {
      title: "title",
      description: "description",
      category: "category",
      priority: "priority",
      status: "status",
      dueDate: "due_date",
      plannedMinutes: "planned_minutes",
      actualMinutes: "actual_minutes",
      progress: "progress",
    };

    for (const [field, column] of Object.entries(columns)) {
      if (field in input && !(field === "progress" && input.status === "Completed")) {
        updates.push([column, input[field as keyof typeof input] as string | number | null]);
      }
    }

    const nextStatus = input.status ?? current.status;
    if (input.status && input.status !== current.status) {
      updates.push(["completed_at", nextStatus === "Completed" ? new Date().toISOString() : null]);
      if (nextStatus === "Completed") updates.push(["progress", 100]);
      else if (input.progress === undefined) updates.push(["progress", 0]);
    } else if (nextStatus === "Completed" && input.progress === undefined && current.progress !== 100) {
      updates.push(["progress", 100]);
    }

    const now = new Date().toISOString();
    updates.push(["updated_at", now]);
    const setClause = updates.map(([column]) => `${column} = ?`).join(", ");
    const values = updates.map(([, value]) => value);
    const action = input.status === "Completed" && current.status !== "Completed"
      ? "completed"
      : input.status && current.status === "Completed" && input.status !== "Completed"
        ? "reopened"
        : "updated";

    const update = database.transaction(() => {
      database.prepare(`UPDATE tasks SET ${setClause} WHERE id = ? AND user_id = ?`).run(...values, id, user.id);
      database.prepare(`
        INSERT INTO task_activity (id, user_id, task_id, task_title, action, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), user.id, id, input.title ?? current.title, action, now);
      return database.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, user.id) as TaskRow;
    });

    return jsonResponse({ task: taskFromRow(update()) });
  } catch {
    return errorResponse("TASK_UPDATE_FAILED", "The task could not be updated.", 500);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    const { id } = await params;
    const current = database.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, user.id) as TaskRow | undefined;
    if (!current) return errorResponse("TASK_NOT_FOUND", "Task not found.", 404);

    const now = new Date().toISOString();
    const remove = database.transaction(() => {
      database.prepare(`
        INSERT INTO task_activity (id, user_id, task_id, task_title, action, created_at)
        VALUES (?, ?, ?, ?, 'deleted', ?)
      `).run(randomUUID(), user.id, id, current.title, now);
      database.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(id, user.id);
    });
    remove();

    return jsonResponse({ deleted: true });
  } catch {
    return errorResponse("TASK_DELETE_FAILED", "The task could not be deleted.", 500);
  }
}
