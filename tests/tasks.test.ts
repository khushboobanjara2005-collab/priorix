import assert from "node:assert/strict";
import test from "node:test";
import { isValidDateOnly, validateTaskInput } from "../src/lib/tasks.ts";

test("task input applies safe defaults and trims text", () => {
  const result = validateTaskInput({ title: "  Read chapter  " });
  assert.deepEqual(result.input, {
    title: "Read chapter",
    description: "",
    category: "Study",
    priority: "Medium",
    status: "Pending",
    dueDate: null,
    plannedMinutes: 0,
    actualMinutes: 0,
    progress: 0,
  });
});

test("task input rejects invalid dates, enum values, and unexpected fields", () => {
  assert.equal(isValidDateOnly("2026-02-29"), false);
  assert.equal(isValidDateOnly("2028-02-29"), true);
  assert.equal(validateTaskInput({ title: "Exam", dueDate: "2026-02-29" }).input, undefined);
  assert.equal(validateTaskInput({ title: "Exam", priority: "Urgent" }).input, undefined);
  assert.equal(validateTaskInput({ title: "Exam", userId: "other-user" }).input, undefined);
});

test("partial task updates require at least one supported field", () => {
  assert.equal(validateTaskInput({}, true).input, undefined);
  assert.deepEqual(validateTaskInput({ actualMinutes: 45 }, true).input, { actualMinutes: 45 });
  assert.equal(validateTaskInput({ progress: 101 }, true).input, undefined);
});
