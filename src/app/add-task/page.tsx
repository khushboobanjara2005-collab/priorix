
"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";

type Importance = "Low" | "Medium" | "High";

interface TaskForm {
  name: string;
  description: string;
  deadline: string;
  importance: Importance;
  estimatedTime: string;
  category: string;
}

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function subscribeToLocalDate() {
  return () => {};
}

function getServerDateString() {
  return "";
}

function priorityScore(task: TaskForm, today: string): number {
  const importancePoints: Record<Importance, number> = {
    Low: 20,
    Medium: 50,
    High: 80,
  };

  let score = importancePoints[task.importance];

  const hours = Number(task.estimatedTime) || 0;

  if (hours >= 3) score += 5;
  if (hours >= 5) score += 5;

  if (task.deadline && today) {
    const [year, month, day] = task.deadline.split("-").map(Number);
    const [todayYear, todayMonth, todayDay] = today
      .split("-")
      .map(Number);

    const dueTime = Date.UTC(year, month - 1, day);
    const todayTime = Date.UTC(
      todayYear,
      todayMonth - 1,
      todayDay
    );

    const daysUntilDue = Math.round(
      (dueTime - todayTime) / 86400000
    );

    if (daysUntilDue <= 1) score += 15;
    else if (daysUntilDue <= 3) score += 10;
    else if (daysUntilDue <= 7) score += 5;
  }

  return Math.min(score, 100);
}

export default function AddTaskPage() {
  const router = useRouter();
  const today = useSyncExternalStore(
    subscribeToLocalDate,
    getLocalDateString,
    getServerDateString
  );

  const [form, setForm] = useState<TaskForm>({
    name: "",
    description: "",
    deadline: "",
    importance: "Medium",
    estimatedTime: "2",
    category: "Study",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const score = useMemo(
    () => priorityScore(form, today),
    [form, today]
  );

  const priority: Importance =
    score >= 75 ? "High" : score >= 45 ? "Medium" : "Low";

  function updateField<K extends keyof TaskForm>(
    field: K,
    value: TaskForm[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));

    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Please enter a task name.";
    }

    if (
      !form.estimatedTime ||
      !Number.isFinite(Number(form.estimatedTime)) ||
      Number(form.estimatedTime) <= 0 ||
      Number(form.estimatedTime) > 100
    ) {
      nextErrors.estimatedTime =
        "Enter a time greater than zero and no more than 100 hours.";
    }

    if (form.deadline && today && form.deadline < today) {
      nextErrors.deadline = "Choose today or a future date.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.name,
          description: form.description,
          dueDate: form.deadline || null,
          priority: form.importance,
          plannedMinutes: Math.round(Number(form.estimatedTime) * 60),
          category: form.category,
          status: "Pending",
          actualMinutes: 0,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setSubmitError(
          response.status === 401
            ? "Sign in before saving tasks."
            : result.error?.message || "The task could not be saved. Please try again."
        );
        return;
      }
      router.push("/my-tasks");
    } catch {
      setSubmitError("The task service is unavailable. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="dashboard">
      <div className="dashboard-heading">
        <div>
          <Link
            href="/"
            className="text-link"
            style={{ marginBottom: 14 }}
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>

          <h1>Create a New Task ✨</h1>
          <p>
            Organize your work, set your priorities, and plan your
            study time.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <Target size={21} />
              <h2>Task Details</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "grid", gap: 20 }}>
              <div className="form-field">
                <label htmlFor="task-name">Task name *</label>
                <input
                  id="task-name"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Prepare for Python exam"
                  maxLength={120}
                  required
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />

                {errors.name && (
                  <p id="name-error" className="form-error" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="task-description">Description</label>
                <textarea
                  id="task-description"
                  className="form-control"
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                  placeholder="What do you need to accomplish?"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="task-deadline">
                    <CalendarDays size={15} />
                    Deadline
                  </label>
                  <input
                    id="task-deadline"
                    className="form-control"
                    type="date"
                    value={form.deadline}
                    min={today || undefined}
                    onChange={(e) =>
                      updateField("deadline", e.target.value)
                    }
                    aria-invalid={Boolean(errors.deadline)}
                    aria-describedby={
                      errors.deadline ? "deadline-error" : undefined
                    }
                  />

                  {errors.deadline && (
                    <p
                      id="deadline-error"
                      className="form-error"
                      role="alert"
                    >
                      {errors.deadline}
                    </p>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="task-category">Category</label>
                  <select
                    id="task-category"
                    className="form-control"
                    value={form.category}
                    onChange={(e) =>
                      updateField("category", e.target.value)
                    }
                  >
                    <option>Study</option>
                    <option>Assignment</option>
                    <option>Exam Preparation</option>
                    <option>Project</option>
                    <option>Personal</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="task-importance">Importance</label>
                  <select
                    id="task-importance"
                    className="form-control"
                    value={form.importance}
                    onChange={(e) =>
                      updateField("importance", e.target.value as Importance)
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="task-time">
                    <Clock3 size={15} />
                    Estimated time (hours)
                  </label>
                  <input
                    id="task-time"
                    className="form-control"
                    type="number"
                    min="0.25"
                    max="100"
                    step="0.25"
                    value={form.estimatedTime}
                    onChange={(e) =>
                      updateField("estimatedTime", e.target.value)
                    }
                    aria-invalid={Boolean(errors.estimatedTime)}
                    aria-describedby={
                      errors.estimatedTime ? "time-error" : undefined
                    }
                  />

                  {errors.estimatedTime && (
                    <p id="time-error" className="form-error" role="alert">
                      {errors.estimatedTime}
                    </p>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <Link href="/" className="secondary-button">
                  Cancel
                </Link>

                <button type="submit" className="primary-button" disabled={isSaving}>
                  <Sparkles size={17} />
                  {isSaving ? "Saving..." : "Create Task"}
                </button>
              </div>
              {submitError && (
                <p className="form-error" role="alert">
                  {submitError}{" "}
                  {submitError.startsWith("Sign in") && <Link href="/login">Sign in</Link>}
                </p>
              )}
            </div>
          </form>
        </section>

        <aside
          style={{
            display: "grid",
            gap: 20,
            alignContent: "start",
          }}
        >
          <section className="panel">
            <div className="panel-heading">
              <div className="panel-title">
                <Sparkles size={21} />
                <h2>Live Priority Preview</h2>
              </div>
            </div>

            <div className="priority-preview">
              <div
                className={`priority-preview-icon priority-${priority.toLowerCase()}`}
              >
                <Target size={27} />
              </div>

              <div>
                <span className="preview-label">Suggested priority</span>
                <h3>{priority}</h3>
              </div>

              <span
                className={`priority-badge priority-${priority.toLowerCase()}`}
              >
                {score}/100
              </span>
            </div>

            <div
              className="priority-progress"
              role="progressbar"
              aria-label="Priority score"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div style={{ width: `${score}%` }} />
            </div>

            <p className="preview-description">
              {score >= 75
                ? "This task deserves close attention. Plan time for it soon."
                : score >= 45
                  ? "Keep this task on your study plan and monitor its deadline."
                  : "You have some flexibility. Schedule it around higher-priority work."}
            </p>

            <div className="preview-summary">
              <div>
                <span>Importance</span>
                <strong>{form.importance}</strong>
              </div>

              <div>
                <span>Study time</span>
                <strong>{form.estimatedTime || "0"} hrs</strong>
              </div>

              <div>
                <span>Category</span>
                <strong>{form.category}</strong>
              </div>

              <div>
                <span>Deadline</span>
                <strong>
                  {form.deadline || "Not set"}
                </strong>
              </div>
            </div>
          </section>

          <section className="panel tips-panel">
            <div className="panel-heading">
              <div className="panel-title">
                <Lightbulb size={21} />
                <h2>Study Tips</h2>
              </div>
            </div>

            <ul className="tips-list">
              <li>Set realistic deadlines that fit your schedule.</li>
              <li>Give important assignments enough preparation time.</li>
              <li>Estimate the actual time needed, including revision.</li>
              <li>Review your priorities as deadlines approach.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
