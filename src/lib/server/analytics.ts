import type { TaskRow } from "@/lib/tasks";

export type AnalyticsPeriod = "Week" | "Month" | "Semester";

type ActivityRow = {
  id: string;
  task_title: string;
  action: "created" | "updated" | "completed" | "reopened" | "deleted";
  created_at: string;
  category: string | null;
  status: string | null;
};

function utcDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(period: AnalyticsPeriod, now: Date) {
  const today = utcDate(now);
  if (period === "Week") {
    const mondayOffset = (today.getUTCDay() + 6) % 7;
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - mondayOffset);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }
  if (period === "Month") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    return { start, end };
  }
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return { start, end };
}

function binsFor(period: AnalyticsPeriod, range: { start: Date; end: Date }) {
  if (period === "Week") {
    return Array.from({ length: 7 }, (_, index) => {
      const start = new Date(range.start);
      start.setUTCDate(start.getUTCDate() + index);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      return { label: start.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }), start, end };
    });
  }
  if (period === "Month") {
    const days = Math.round((range.end.getTime() - range.start.getTime()) / 86400000);
    return Array.from({ length: Math.ceil(days / 7) }, (_, index) => {
      const start = new Date(range.start);
      start.setUTCDate(start.getUTCDate() + index * 7);
      const end = new Date(range.start);
      end.setUTCDate(end.getUTCDate() + Math.min((index + 1) * 7, days));
      return { label: `Week ${index + 1}`, start, end };
    });
  }
  return Array.from({ length: 6 }, (_, index) => {
    const start = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth() + index, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    return { label: start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), start, end };
  });
}

function inRange(value: string | null, start: string, end: string) {
  return Boolean(value && value >= start && value < end);
}

export function calculateAnalytics(
  tasks: TaskRow[],
  activity: ActivityRow[],
  period: AnalyticsPeriod,
  now = new Date()
) {
  const range = rangeFor(period, now);
  const start = dateKey(range.start);
  const end = dateKey(range.end);
  const today = dateKey(utcDate(now));
  const dueInPeriod = tasks.filter((task) => task.due_date && task.due_date >= start && task.due_date < end);
  const completedInPeriod = tasks.filter((task) => inRange(task.completed_at, start, end));
  const completedTotal = tasks.filter((task) => task.status === "Completed").length;
  const overdue = tasks.filter((task) => task.status !== "Completed" && task.due_date && task.due_date < today).length;
  const bins = binsFor(period, range);
  const categories = new Map<string, number>();
  const priorities = new Map<string, number>();

  for (const task of dueInPeriod) {
    categories.set(task.category, (categories.get(task.category) ?? 0) + 1);
    priorities.set(task.priority, (priorities.get(task.priority) ?? 0) + 1);
  }

  return {
    period,
    range: { start, end: dateKey(new Date(range.end.getTime() - 86400000)) },
    summary: {
      total: tasks.length,
      completed: completedTotal,
      pending: tasks.length - completedTotal,
      overdue,
      completionRate: tasks.length ? Math.round((completedTotal / tasks.length) * 100) : 0,
      planned: dueInPeriod.length,
      completedInPeriod: completedInPeriod.length,
      periodCompletionRate: dueInPeriod.length ? Math.round((completedInPeriod.length / dueInPeriod.length) * 100) : 0,
    },
    series: bins.map((bin) => {
      const binStart = dateKey(bin.start);
      const binEnd = dateKey(bin.end);
      return {
        label: bin.label,
        planned: tasks.filter((task) => task.due_date && task.due_date >= binStart && task.due_date < binEnd).length,
        completed: tasks.filter((task) => inRange(task.completed_at, binStart, binEnd)).length,
      };
    }),
    categories: [...categories].map(([name, count]) => ({ name, count })),
    priorities: [...priorities].map(([name, count]) => ({ name, count })),
    studyTime: {
      plannedMinutes: dueInPeriod.reduce((sum, task) => sum + task.planned_minutes, 0),
      actualMinutes: dueInPeriod.reduce((sum, task) => sum + task.actual_minutes, 0),
      hasTrackedTime: dueInPeriod.some((task) => task.actual_minutes > 0),
    },
    recentActivity: activity.map((entry) => ({
      id: entry.id,
      title: entry.task_title,
      category: entry.category,
      status: entry.status,
      action: entry.action,
      createdAt: entry.created_at,
    })),
  };
}
