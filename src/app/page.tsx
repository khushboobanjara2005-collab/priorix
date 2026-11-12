
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import AuthRequired from "@/components/auth/AuthRequired";
import type { Task } from "@/lib/tasks";
import {
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  BarChart3,
  Target,
  CalendarDays,
  Plus,
  ArrowRight,
  BookOpen,
  Code2,
} from "lucide-react";

function subscribeToLocalDate() {
  return () => {};
}

function getLocalDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getServerDateKey() {
  return "";
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTasks() {
      try {
        const response = await fetch("/api/tasks?limit=100&sort=deadline", { cache: "no-store" });
        const result = await response.json();
        if (cancelled) return;
        if (response.status === 401) setAuthRequired(true);
        else if (!response.ok) setError(result.error?.message || "Your tasks could not be loaded.");
        else setTasks(result.data.tasks as Task[]);
      } catch {
        if (!cancelled) setError("The task service is unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadTasks();
    return () => { cancelled = true; };
  }, []);

  const todayKey = useSyncExternalStore(subscribeToLocalDate, getLocalDateKey, getServerDateKey);
  function daysUntil(value: string | null) {
    if (!value || !todayKey) return null;
    const [year, month, day] = value.split("-").map(Number);
    const due = Date.UTC(year, month - 1, day);
    const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
    const current = Date.UTC(todayYear, todayMonth - 1, todayDay);
    return Math.round((due - current) / 86400000);
  }
  function dueLabel(value: string | null) {
    const days = daysUntil(value);
    if (days === null) return "No deadline";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days < 7) return `In ${days} days`;
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  const activeTasks = tasks.filter((task) => task.status !== "Completed");
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const priorityTasks = [...activeTasks]
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 4);
  const upcomingDeadlines = [...activeTasks]
    .filter((task) => task.dueDate)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 4);
  const dueSoonCount = activeTasks.filter((task) => {
    const days = daysUntil(task.dueDate);
    return days !== null && days >= 0 && days <= 3;
  }).length;
  const highPriorityCount = activeTasks.filter((task) => task.priority === "High").length;
  const completedCount = tasks.filter((task) => task.status === "Completed").length;
  const stats = [
    { label: "High Priority", value: highPriorityCount, icon: Target, color: "pink" },
    { label: "Due Soon", value: dueSoonCount, icon: Clock3, color: "yellow" },
    { label: "Completed", value: completedCount, icon: CheckCircle2, color: "green" },
    { label: "Total Tasks", value: tasks.length, icon: BarChart3, color: "purple" },
  ];

  async function toggleTask(task: Task) {
    setUpdatingTask(task.id);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      const result = await response.json();
      if (response.status === 401) setAuthRequired(true);
      else if (!response.ok) setError(result.error?.message || "Task status could not be updated.");
      else setTasks((current) => current.map((item) => item.id === task.id ? result.data.task as Task : item));
    } catch {
      setError("The task service is unavailable.");
    } finally {
      setUpdatingTask(null);
    }
  }

  if (loading) return <div className="dashboard"><p role="status">Loading your study overview...</p></div>;
  if (authRequired) return <div className="dashboard"><AuthRequired /></div>;

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
            <h1>Your Study Overview <span aria-hidden="true">✦</span></h1>
          <p>
            Here&apos;s your study overview for today. Let&apos;s make it productive.
          </p>
        </div>

        <Link href="/add-task" className="primary-button">
          <Plus size={18} />Add New Task
        </Link>
      </div>

      <section className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              className={`stat-card stat-${stat.color}`}
              key={stat.label}
            >
              <div className="stat-icon">
                <Icon size={25} />
              </div>

              <div>
                <h2>{stat.value}</h2>
                <p>{stat.label}</p>
              </div>

              <ArrowRight className="stat-arrow" size={18} />
            </article>
          );
        })}
      </section>

      <div className="dashboard-grid">
        <section className="panel priority-panel">
          <div className="panel-heading">
            <div className="panel-title">
              <Target size={21} />
              <h2>Today&apos;s Priority Tasks</h2>
            </div>

            <Link href="/my-tasks" className="text-link">
              View All <ArrowRight size={15} />
            </Link>
          </div>

          <div className="task-list">
            {priorityTasks.length === 0 ? <p className="dashboard-empty">No upcoming tasks. Add one to start planning.</p> : priorityTasks.map((task, index) => (
              <article className="priority-task" key={task.title}>
                <div className={`task-number number-${index + 1}`}>
                  {index + 1}
                </div>

                <button
                  type="button"
                  className="task-checkbox"
                  onClick={() => toggleTask(task)}
                  disabled={updatingTask === task.id}
                  aria-label={`Mark ${task.title} complete`}
                >
                  <CheckCircle2 size={18} />
                </button>

                <div className="task-details">
                  <h3>{task.title}</h3>

                  <div className="task-meta">
                    <span>
                      <CalendarDays size={14} />
                      {dueLabel(task.dueDate)}
                    </span>

                    <span>
                      <Clock3 size={14} />
                      {task.plannedMinutes ? `${(task.plannedMinutes / 60).toFixed(1)} hours` : "Time not set"}
                    </span>
                  </div>
                </div>

                <span
                  className={`priority-badge ${task.priority.toLowerCase()}`}
                >
                  {task.priority}
                </span>

                <div
                  className="progress-ring"
                  style={{
                    background: `conic-gradient(var(--primary) ${task.progress}%, #eae4f7 0)`,
                  }}
                  aria-label={`${task.progress}% complete`}
                >
                  <span>{task.progress}%</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel deadlines-panel">
          <div className="panel-heading">
            <div className="panel-title">
              <CalendarDays size={21} />
              <h2>Upcoming Deadlines</h2>
            </div>

            <Link href="/my-tasks" className="text-link">
              View All <ArrowRight size={15} />
            </Link>
          </div>

          <div className="deadline-list">
            {upcomingDeadlines.length === 0 ? <p className="dashboard-empty">No upcoming deadlines.</p> : upcomingDeadlines.map((task, index) => (
              <div className="deadline-row" key={task.id}>
                <span
                  className={`deadline-dot dot-${index === 0 ? "pink" : index === 1 ? "yellow" : "purple"}`}
                />

                <span className="deadline-title">
                  {task.title}
                </span>

                <span className={`deadline-date date-${index === 0 ? "pink" : index === 1 ? "yellow" : "purple"}`}>
                  {dueLabel(task.dueDate)}
                </span>
              </div>
            ))}
          </div>

          <div className="panel-divider" />

          <div className="panel-heading quick-heading">
            <div className="panel-title">
              <ClipboardCheck size={21} />
              <h2>Quick Actions</h2>
            </div>
          </div>

          <div className="quick-actions">
            <a href="/add-task" className="quick-action">
              <Plus size={18} />
              Add New Task
            </a>

            <a href="/assistant" className="quick-action">
              <BookOpen size={18} />
              AI Assistant
            </a>

            <Link href="/my-tasks" className="quick-action">
              <ClipboardCheck size={18} />
              View My Tasks
            </Link>

            <Link href="/analytics" className="quick-action">
              <Code2 size={18} />
              View Analytics
            </Link>
          </div>
        </section>
      </div>

      {error && <p className="dashboard-note" role="alert">{error}</p>}
      <p className="dashboard-note">
        Your progress, one task at a time. ♡
      </p>
    </div>
  );
}
