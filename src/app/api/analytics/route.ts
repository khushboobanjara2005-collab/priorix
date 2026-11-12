import { database } from "@/lib/server/database";
import { calculateAnalytics, type AnalyticsPeriod } from "@/lib/server/analytics";
import {
  errorResponse,
  getRequestUser,
  jsonResponse,
  unauthorizedResponse,
} from "@/lib/server/api";
import type { TaskRow } from "@/lib/tasks";

type ActivityRow = {
  id: string;
  task_title: string;
  action: "created" | "updated" | "completed" | "reopened" | "deleted";
  created_at: string;
  category: string | null;
  status: string | null;
};

const periods: AnalyticsPeriod[] = ["Week", "Month", "Semester"];

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();

    const periodValue = new URL(request.url).searchParams.get("period") ?? "Week";
    if (!periods.includes(periodValue as AnalyticsPeriod)) {
      return errorResponse("INVALID_PERIOD", "Choose Week, Month, or Semester.", 400);
    }

    const tasks = database.prepare("SELECT * FROM tasks WHERE user_id = ?").all(user.id) as TaskRow[];
    const activity = database.prepare(`
      SELECT a.id, a.task_title, a.action, a.created_at, t.category, t.status
      FROM task_activity a
      LEFT JOIN tasks t ON t.id = a.task_id AND t.user_id = a.user_id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 6
    `).all(user.id) as ActivityRow[];

    return jsonResponse(calculateAnalytics(tasks, activity, periodValue as AnalyticsPeriod));
  } catch {
    return errorResponse("ANALYTICS_FAILED", "Analytics could not be loaded.", 500);
  }
}
