
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import AuthRequired from "@/components/auth/AuthRequired";
import type { Task, TaskPriority, TaskStatus } from "@/lib/tasks";
import {
  Search,
  Plus,
  SlidersHorizontal,
  CalendarDays,
  Clock3,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  ListTodo,
  X,
  ArrowUpDown,
} from "lucide-react";

const priorityClass: Record<TaskPriority, string> = {
  High: "task-priority-high",
  Medium: "task-priority-medium",
  Low: "task-priority-low",
};

const statusClass: Record<TaskStatus, string> = {
  Pending: "task-status-pending",
  "In Progress": "task-status-progress",
  Completed: "task-status-completed",
};

function formatDate(value: string | null) {
  if (!value) return "No deadline";

  const date = new Date(`${value}T12:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [sortBy, setSortBy] = useState("deadline");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTasks() {
      try {
        const response = await fetch("/api/tasks?limit=100", { cache: "no-store" });
        const result = await response.json();
        if (cancelled) return;
        if (response.status === 401) {
          setAuthRequired(true);
        } else if (!response.ok) {
          setError(result.error?.message || "Tasks could not be loaded.");
        } else {
          setTasks(result.data.tasks as Task[]);
        }
      } catch {
        if (!cancelled) setError("The task service is unavailable.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadTasks();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(
    () => [...new Set(tasks.map((task) => task.category))],
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);

      return (
        matchesSearch &&
        (statusFilter === "All" || task.status === statusFilter) &&
        (priorityFilter === "All" ||
          task.priority === priorityFilter) &&
        (categoryFilter === "All" ||
          task.category === categoryFilter) &&
        (!dueFrom || Boolean(task.dueDate && task.dueDate >= dueFrom)) &&
        (!dueTo || Boolean(task.dueDate && task.dueDate <= dueTo))
      );
    });

    return result.sort((a, b) => {
      if (sortBy === "priority") {
        const rank: Record<TaskPriority, number> = {
          High: 0,
          Medium: 1,
          Low: 2,
        };

        return rank[a.priority] - rank[b.priority];
      }

      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }

      return (
        (a.dueDate || "9999-12-31").localeCompare(
          b.dueDate || "9999-12-31"
        )
      );
    });
  }, [
    tasks,
    search,
    statusFilter,
    priorityFilter,
    categoryFilter,
    dueFrom,
    dueTo,
    sortBy,
  ]);

  const completedCount = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const completionPercentage = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  async function saveTaskChanges(task: Task, values: Record<string, unknown>) {
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthRequired(true);
        return null;
      }
      if (!response.ok) {
        setError(result.error?.message || "The task could not be updated.");
        return null;
      }
      return result.data.task as Task;
    } catch {
      setError("The task service is unavailable.");
      return null;
    }
  }

  async function updateStatus(task: Task) {
    const status: TaskStatus = task.status === "Completed" ? "Pending" : "Completed";
    const updated = await saveTaskChanges(task, { status });
    if (updated) {
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTask || !editingTask.title.trim()) return;

    const title = editingTask.title.trim();
    const category = editingTask.category.trim();

    if (!category) return;

    const updated = await saveTaskChanges(editingTask, {
      title,
      description: editingTask.description,
      category,
      priority: editingTask.priority,
      status: editingTask.status,
      dueDate: editingTask.dueDate,
      plannedMinutes: editingTask.plannedMinutes,
      actualMinutes: editingTask.actualMinutes,
      progress: editingTask.progress,
    });
    if (updated) {
      setTasks((current) => current.map((task) => task.id === updated.id ? updated : task));
      setEditingTask(null);
    }
  }

  async function confirmDelete() {
    if (deleteId === null) return;
    try {
      const response = await fetch(`/api/tasks/${deleteId}`, { method: "DELETE" });
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (!response.ok) {
        const result = await response.json();
        setError(result.error?.message || "The task could not be deleted.");
        return;
      }
      setTasks((current) => current.filter((task) => task.id !== deleteId));
      setDeleteId(null);
    } catch {
      setError("The task service is unavailable.");
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCategoryFilter("All");
    setDueFrom("");
    setDueTo("");
    setSortBy("deadline");
  }

  if (authRequired) {
    return <div className="my-tasks-page"><AuthRequired /></div>;
  }

  if (isLoading) {
    return <div className="my-tasks-page"><p className="tasks-loading" role="status">Loading your tasks...</p></div>;
  }

  return (
    // Do not add "main-content" here.
    // The application layout should handle the sidebar offset.
    <div className="my-tasks-page">
      <header className="tasks-heading">
        <div>
          <span className="tasks-eyebrow">
            YOUR STUDY WORKSPACE
          </span>

          <h1>
            My Tasks <span aria-hidden="true">✦</span>
          </h1>

          <p>
            Stay organized, focus on what matters, and make progress.
          </p>
        </div>

        <Link
          href="/add-task"
          className="tasks-add-button"
        >
          <Plus size={19} />
          Add New Task
        </Link>
      </header>

      <section
        className="tasks-overview"
        aria-label="Task completion overview"
      >
        <div className="tasks-overview-icon">
          <ListTodo size={24} />
        </div>

        <div className="tasks-overview-copy">
          <strong>
            {tasks.length}{" "}
            {tasks.length === 1 ? "task" : "tasks"} in your workspace
          </strong>

          <span>
            {completedCount} completed ·{" "}
            {tasks.length - completedCount} remaining
          </span>
        </div>

        <div className="tasks-overview-progress">
          <div>
            <span>Overall completion</span>
            <strong>{completionPercentage}%</strong>
          </div>

          <div
            className="tasks-progress-track"
            role="progressbar"
            aria-label="Overall task completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionPercentage}
          >
            <div
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </section>

      <section
        className="tasks-toolbar"
        aria-label="Search and filter tasks"
      >
        <div className="tasks-search">
          <Search size={19} aria-hidden="true" />

          <input
            type="search"
            placeholder="Search your tasks..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search tasks"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={17} />
            </button>
          )}
        </div>

        <div className="tasks-filter-heading">
          <SlidersHorizontal size={17} />
          <span>Filters</span>
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <label className="tasks-date-filter">
          Due from
          <input type="date" value={dueFrom} onChange={(event) => setDueFrom(event.target.value)} />
        </label>

        <label className="tasks-date-filter">
          Due by
          <input type="date" value={dueTo} onChange={(event) => setDueTo(event.target.value)} />
        </label>

        <select
          value={priorityFilter}
          onChange={(event) =>
            setPriorityFilter(event.target.value)
          }
          aria-label="Filter by priority"
        >
          <option value="All">All priorities</option>
          <option value="High">High priority</option>
          <option value="Medium">Medium priority</option>
          <option value="Low">Low priority</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value)
          }
          aria-label="Filter by category"
        >
          <option value="All">All categories</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <label className="tasks-sort">
          <ArrowUpDown size={16} />

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Sort tasks"
          >
            <option value="deadline">Deadline</option>
            <option value="priority">Priority</option>
            <option value="title">Task name</option>
          </select>
        </label>

        <button
          type="button"
          className="tasks-clear-filters"
          onClick={clearFilters}
        >
          Reset
        </button>
      </section>

      {error && <p className="tasks-feedback-error" role="alert">{error}</p>}

      <section className="tasks-list-panel">
        <div className="tasks-list-header">
          <div>
            <h2>All Tasks</h2>
            <p>
              Showing {filteredTasks.length} of {tasks.length} tasks
            </p>
          </div>

          <span className="tasks-list-count">
            {filteredTasks.length} results
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="tasks-empty">
            <div>
              <Search size={27} />
            </div>

            <h3>{tasks.length === 0 ? "No tasks yet" : "No tasks found"}</h3>
            <p>{tasks.length === 0 ? "Create your first task to start planning." : "Try changing your search or filters."}</p>

            {tasks.length === 0 ? (
              <Link href="/add-task">Create a task</Link>
            ) : (
              <button type="button" onClick={clearFilters}>Clear all filters</button>
            )}
          </div>
        ) : (
          <div className="tasks-table-wrap">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th scope="col">Task</th>
                  <th scope="col">Category</th>
                  <th scope="col">Deadline</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Progress</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div className="tasks-name-cell">
                        <button
                          type="button"
                          className={`tasks-check ${
                            task.status === "Completed"
                              ? "is-checked"
                              : ""
                          }`}
                          onClick={() => updateStatus(task)}
                          aria-label={
                            task.status === "Completed"
                              ? `Mark ${task.title} as pending`
                              : `Mark ${task.title} as completed`
                          }
                          title="Toggle completion"
                        >
                          {task.status === "Completed" ? (
                            <CheckCircle2 size={20} />
                          ) : (
                            <Circle size={20} />
                          )}
                        </button>

                        <div>
                          <strong
                            className={
                              task.status === "Completed"
                                ? "tasks-completed-title"
                                : ""
                            }
                          >
                            {task.title}
                          </strong>

                          <span>{task.description}</span>

                          <small>
                            <Clock3 size={13} />
                            {(task.plannedMinutes / 60).toFixed(1)}h planned
                            {task.actualMinutes > 0 && ` · ${(task.actualMinutes / 60).toFixed(1)}h actual`}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="tasks-category">
                        {task.category}
                      </span>
                    </td>

                    <td>
                      <span className="tasks-date">
                        <CalendarDays size={15} />
                        {formatDate(task.dueDate)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`tasks-badge ${
                          priorityClass[task.priority]
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`tasks-badge ${
                          statusClass[task.status]
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>

                    <td>
                      <div className="tasks-row-progress">
                        <div
                          className="tasks-row-progress-track"
                          role="progressbar"
                          aria-label={`${task.title} progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={task.progress}
                        >
                          <div
                            style={{
                              width: `${task.progress}%`,
                            }}
                          />
                        </div>

                        <span>{task.progress}%</span>
                      </div>
                    </td>

                    <td>
                      <div className="tasks-row-actions">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingTask({ ...task })
                          }
                          aria-label={`Edit ${task.title}`}
                          title="Edit task"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="tasks-delete-action"
                          onClick={() => setDeleteId(task.id)}
                          aria-label={`Delete ${task.title}`}
                          title="Delete task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingTask && (
        <div
          className="tasks-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditingTask(null);
            }
          }}
        >
          <section
            className="tasks-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-task-title"
          >
            <div className="tasks-modal-heading">
              <div>
                <h2 id="edit-task-title">Edit Task</h2>
                <p>Update the task details.</p>
              </div>

              <button
                type="button"
                onClick={() => setEditingTask(null)}
                aria-label="Close edit dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveEdit}
              className="tasks-edit-form"
            >
              <label>
                Task name
                <input
                  required
                  maxLength={120}
                  value={editingTask.title}
                  onChange={(event) =>
                    setEditingTask({
                      ...editingTask,
                      title: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Description
                <textarea
                  maxLength={1000}
                  value={editingTask.description}
                  onChange={(event) =>
                    setEditingTask({
                      ...editingTask,
                      description: event.target.value,
                    })
                  }
                />
              </label>

              <div className="tasks-edit-grid">
                <label>
                  Deadline
                  <input
                    type="date"
                    value={editingTask.dueDate ?? ""}
                    onChange={(event) =>
                      setEditingTask({
                        ...editingTask,
                        dueDate: event.target.value || null,
                      })
                    }
                  />
                </label>

                <label>
                  Category
                  <input
                    maxLength={50}
                    required
                    value={editingTask.category}
                    onChange={(event) =>
                      setEditingTask({
                        ...editingTask,
                        category: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Priority
                  <select
                    value={editingTask.priority}
                    onChange={(event) =>
                      setEditingTask({ ...editingTask, priority: event.target.value as TaskPriority })
                    }
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={editingTask.status}
                    onChange={(event) => {
                      const status = event.target.value as TaskStatus;

                      setEditingTask({
                        ...editingTask,
                        status,
                        progress:
                          status === "Completed"
                            ? 100
                            : status === "Pending"
                              ? 0
                              : editingTask.progress === 100
                                ? 0
                                : editingTask.progress,
                      });
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>
              </div>

              <label>
                Estimated time (hours)
                <input
                  type="number"
                  min="0.5"
                  max="1000"
                  step="0.5"
                  required
                  value={editingTask.plannedMinutes / 60}
                  onChange={(event) =>
                    setEditingTask({
                      ...editingTask,
                      plannedMinutes: Math.round(Number(event.target.value) * 60),
                    })
                  }
                />
              </label>

              <label>
                Actual study time (hours)
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.25"
                  value={editingTask.actualMinutes / 60}
                  onChange={(event) => setEditingTask({
                    ...editingTask,
                    actualMinutes: Math.round(Number(event.target.value) * 60),
                  })}
                />
              </label>

              <div className="tasks-modal-actions">
                <button
                  type="button"
                  className="tasks-cancel-button"
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tasks-save-button"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteId !== null && (
        <div className="tasks-modal-backdrop">
          <section
            className="tasks-modal tasks-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
          >
            <div className="tasks-delete-icon">
              <Trash2 size={24} />
            </div>

            <h2 id="delete-task-title">
              Delete this task?
            </h2>

            <p>
              This will permanently remove the task from your workspace.
            </p>

            <div className="tasks-modal-actions">
              <button
                type="button"
                className="tasks-cancel-button"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="tasks-confirm-delete"
                onClick={confirmDelete}
              >
                Delete Task
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
