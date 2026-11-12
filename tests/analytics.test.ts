import assert from "node:assert/strict";
import test from "node:test";
import { calculateAnalytics } from "../src/lib/server/analytics.ts";
import type { TaskRow } from "../src/lib/tasks.ts";

function task(overrides: Partial<TaskRow>): TaskRow {
  return {
    id: "task-id",
    user_id: "user-id",
    title: "Study task",
    description: "",
    category: "Study",
    priority: "Medium",
    status: "Pending",
    due_date: null,
    planned_minutes: 60,
    actual_minutes: 0,
    progress: 0,
    completed_at: null,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

test("weekly analytics use Monday-to-Sunday ranges and count overdue tasks", () => {
  const result = calculateAnalytics(
    [
      task({ id: "monday", due_date: "2026-10-12", status: "Completed", progress: 100, completed_at: "2026-10-12T10:00:00.000Z" }),
      task({ id: "sunday", due_date: "2026-10-18" }),
      task({ id: "completed-early", due_date: "2026-10-19", status: "Completed", progress: 100, completed_at: "2026-10-15T10:00:00.000Z" }),
      task({ id: "overdue", due_date: "2026-10-11" }),
    ],
    [],
    "Week",
    new Date("2026-10-12T12:00:00.000Z")
  );

  assert.deepEqual(result.range, { start: "2026-10-12", end: "2026-10-18" });
  assert.equal(result.summary.total, 4);
  assert.equal(result.summary.planned, 2);
  assert.equal(result.summary.completedInPeriod, 2);
  assert.equal(result.summary.periodCompletionRate, 100);
  assert.equal(result.summary.overdue, 1);
  assert.equal(result.series.length, 7);
  assert.equal(result.series[0].label, "Mon");
  assert.equal(result.series[0].completed, 1);
  assert.equal(result.series[3].completed, 1);
});

test("monthly analytics include the final calendar day in the last chart bucket", () => {
  const result = calculateAnalytics(
    [
      task({ id: "first", due_date: "2026-10-01" }),
      task({ id: "last", due_date: "2026-10-31", status: "Completed", progress: 100, completed_at: "2026-10-31T19:00:00.000Z" }),
      task({ id: "outside", due_date: "2026-11-01" }),
    ],
    [],
    "Month",
    new Date("2026-10-16T12:00:00.000Z")
  );

  assert.deepEqual(result.range, { start: "2026-10-01", end: "2026-10-31" });
  assert.equal(result.summary.planned, 2);
  assert.equal(result.series.length, 5);
  assert.equal(result.series[0].planned, 1);
  assert.equal(result.series[4].planned, 1);
  assert.equal(result.series[4].completed, 1);
});

test("semester analytics cover the current and previous five calendar months", () => {
  const result = calculateAnalytics(
    [
      task({ id: "before", due_date: "2026-04-30" }),
      task({ id: "included", due_date: "2026-05-01" }),
      task({ id: "last-day", due_date: "2026-10-31" }),
    ],
    [],
    "Semester",
    new Date("2026-10-12T12:00:00.000Z")
  );

  assert.deepEqual(result.range, { start: "2026-05-01", end: "2026-10-31" });
  assert.equal(result.summary.planned, 2);
  assert.equal(result.series.length, 6);
  assert.equal(result.series[0].label, "May");
  assert.equal(result.series[5].label, "Oct");
  assert.equal(result.series[5].planned, 1);
});
