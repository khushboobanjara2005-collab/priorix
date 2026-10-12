# Priorix

Priorix is a Next.js 16 App Router study planner with persistent tasks, account-scoped analytics, and an optional Gemini study assistant.

## Requirements

- Node.js 24 LTS or newer (Node 22.5+ supports the native SQLite dependency).
- npm.
- A newly created Google AI Studio Gemini API key to enable AI responses.

Install dependencies:

```bash
npm install
```

## Project Structure

```text
priorix/
├── public/                    # Static assets
├── scripts/
│   └── db-migrate.mjs         # Additive Better Auth SQLite migration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/chat/       # Authenticated, server-side Gemini chat
│   │   │   ├── analytics/     # Account-scoped analytics API
│   │   │   ├── auth/[...all]/ # Better Auth endpoints
│   │   │   └── tasks/         # Persistent task APIs
│   │   ├── add-task/
│   │   ├── analytics/         # Analytics page and CSS module
│   │   ├── assistant/
│   │   ├── login/
│   │   ├── my-tasks/
│   │   └── register/
│   ├── components/
│   │   ├── auth/
│   │   └── layout/
│   └── lib/
│       ├── server/            # Database, auth, API, and analytics logic
│       ├── auth-client.ts
│       └── tasks.ts           # Shared task types and validation
├── tests/                     # Task and analytics tests
├── .env.example               # Safe environment-variable template
├── package.json
└── README.md
```

Local environment files, SQLite data, dependencies, and build output are excluded from this overview and ignored by Git where applicable.

## Local Setup

Copy `.env.example` to `.env.local` and set:

- `BETTER_AUTH_SECRET`: a unique random value of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` and place it in `.env.local`.
- `BETTER_AUTH_URL`: the exact origin used to open the app, normally `http://localhost:3000`. Keep it aligned with the port and hostname used by Next.js.
- `GEMINI_API_KEY`: a newly created key from [Google AI Studio](https://aistudio.google.com/apikey). Do not reuse a key that may have been exposed.
- `GEMINI_MODEL`: optional model override; default is `gemini-3.8-flash`.

The Gemini SDK is the official `@google/genai` package. The key is read only by the server route and is never returned to the browser. `.env.local` is ignored by Git.

Initialize Better Auth's additive SQLite tables, then start Next.js:

```bash
npm run db:migrate -- --yes
npm run dev
```

The migration wrapper loads Next.js environment files, including `.env.local`. The application creates the task, activity, and AI rate-limit tables automatically. The SQLite file is `data/priorix.sqlite`; both the data directory and local environment files are ignored by Git. The migration does not delete existing data.

Create an account at `/register`, sign in at `/login`, and then use the Home, Add Task, My Tasks, Analytics, and AI Assistant pages. Registration requires a password of at least 10 characters.

## Database and Authentication

The project uses `better-sqlite3` for a local file-backed SQLite database and Better Auth for email/password registration, password hashing, secure cookie sessions, logout, and session validation. User task data is associated with the authenticated Better Auth user ID. Every task, analytics, and AI-context query derives that ID from the server-validated session; client-supplied user IDs are rejected.

SQLite is suitable for local development and single-instance deployments with a persistent disk. Do not use the local file on serverless hosting with ephemeral filesystems or multiple app instances; use a managed database and an appropriate Better Auth adapter before deploying there. Back up `data/priorix.sqlite` before any manual database maintenance.

## API

Successful responses use `{ "data": ... }`; errors use `{ "error": { "code": ..., "message": ... } }`. Task and analytics APIs require a signed-in session and return `401` otherwise.

| Method and path | Purpose |
| --- | --- |
| Better Auth `/api/auth/*` | Email/password registration, login, session, and logout endpoints. |
| `GET /api/tasks` | List the signed-in user's tasks. Supports `search`, `status`, `priority`, `category`, `dueFrom`, `dueTo`, `sort`, and `limit` query parameters. |
| `POST /api/tasks` | Create a task with title, description, category, priority, status, `dueDate`, `plannedMinutes`, and `actualMinutes`. |
| `GET /api/tasks/:id` | Read one owned task. |
| `PATCH /api/tasks/:id` | Update supported task fields or mark complete/reopen. Completion timestamps and activity entries are maintained. |
| `DELETE /api/tasks/:id` | Delete an owned task and retain a task-activity record. |
| `GET /api/analytics?period=Week\|Month\|Semester` | Read account-scoped totals, overdue tasks, completion trends, categories, priorities, study time, and recent activity for the selected range. |
| `POST /api/ai/chat` | Send an authenticated study question and optional recent conversation history to Gemini. |

Task durations are stored as integer minutes. Actual time is optional and can be edited in My Tasks; the Analytics page never estimates actual study hours from completed tasks. The Assistant includes only a small account-scoped task summary when a question is about tasks or deadlines. Task text is treated as untrusted data, and AI chat does not create or change tasks.

## Gemini Assistant

The server validates each message (maximum 2,000 characters), limits supplied history, and permits up to 8 requests per account per minute. Provider timeouts, missing keys, invalid credentials, quota limits, unavailable models, and temporary provider outages return safe error messages. The UI renders Markdown with `react-markdown`; raw HTML is not enabled.

Without `GEMINI_API_KEY`, `/api/ai/chat` returns `503 AI_NOT_CONFIGURED`. Add a newly generated key to `.env.local`, restart the dev server, sign in, and send a question at `/assistant` to test a real response. No live Gemini request is performed by the automated test suite.

## Checks

```bash
npm test
npm run lint
npm run build
```

The tests cover task input validation and weekly/monthly/semester analytics boundaries. For a manual persistence check, create a task, reload My Tasks, edit it, toggle completion, and delete it; then verify Analytics updates. Use two accounts to confirm each account sees only its own tasks.

## Troubleshooting

- `BETTER_AUTH_SECRET` errors: set a unique 32+ character secret in `.env.local` and restart the server.
- Registration or session errors: verify `BETTER_AUTH_URL` matches the exact local origin and rerun `npm run db:migrate -- --yes` if Better Auth reports missing tables.
- SQLite native module errors: install with a supported Node.js version and rerun `npm install`.
- AI not configured: add a newly generated `GEMINI_API_KEY`; never add a `NEXT_PUBLIC_` key.
- Port changes: update `BETTER_AUTH_URL` to the new origin before testing sign-in.
