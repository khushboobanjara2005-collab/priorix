import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const globalForDatabase = globalThis as typeof globalThis & {
  priorixDatabase?: Database.Database;
};

function createDatabase() {
  const databasePath = join(process.cwd(), "data", "priorix.sqlite");

  mkdirSync(dirname(databasePath), { recursive: true });

  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Study',
      priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
      status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed')),
      due_date TEXT,
      planned_minutes INTEGER NOT NULL DEFAULT 0 CHECK (planned_minutes >= 0),
      actual_minutes INTEGER NOT NULL DEFAULT 0 CHECK (actual_minutes >= 0),
      progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS tasks_user_due_date_idx
      ON tasks (user_id, due_date);
    CREATE INDEX IF NOT EXISTS tasks_user_updated_at_idx
      ON tasks (user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS task_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      task_id TEXT,
      task_title TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'completed', 'reopened', 'deleted')),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS task_activity_user_created_idx
      ON task_activity (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ai_requests_user_created_idx
      ON ai_requests (user_id, created_at DESC);
  `);

  return database;
}

export const database = globalForDatabase.priorixDatabase ?? createDatabase();

globalForDatabase.priorixDatabase = database;
