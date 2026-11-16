# StudyFlow AI — Study Progress Tracker with Prerequisite Rules

StudyFlow AI is a full-stack SaaS web application for structured self-directed learning and cohort mentoring. It enforces Directed Acyclic Graph (DAG) prerequisite rules across study topics, tracks study sessions against dynamically configurable limits, computes live progress analytics, and includes a strictly user-scoped RAG AI Learning Assistant.

---

## 1. Key Features

- **Role-Based Authentication**: JWT access & refresh tokens with `scrypt` password hashing and `learner` / `mentor` role enforcement across all API routes.
- **Study Goals & Topics**: Full CRUD management of learning goals, estimated topic durations, and interactive SVG topological dependency graphs.
- **DAG Prerequisite Engine**:
  - Prevents self-prerequisites and direct/transitive circular dependencies via DFS reachability validation.
  - Enforces the database-configured maximum prerequisites per topic.
  - Dynamically derives `locked`, `available`, and `completed` topic statuses from live prerequisite states.
  - Returns exact `missingPrerequisites` when a locked topic cannot be completed.
  - Dynamically relocks incomplete dependent topics whenever a prerequisite is reopened.
- **Study Session Tracker**: Validates duration against live database rules (default 5–480 minutes), rejects future dates, validates goal/topic ownership, and supports filtering by goal, topic, and date range.
- **Progress Analytics Dashboard**: Live SQL aggregations rendered with Recharts (weekly daily minutes, 6-week activity trend, goal completion comparison, and upcoming target dates).
- **Mentor Admin Console**: Search learners, inspect individual learner goals, prerequisite states, and study sessions, and update business rules (`minSessionMinutes`, `maxSessionMinutes`, `maxPrerequisitesPerTopic`) in the database without code changes or server restarts.
- **AI Learning Assistant (RAG)**: Floating chat drawer and dedicated workspace powered by `@google/genai` (`gemini-4-hydrogen` + `gemini-embedding-2`) combining exact SQL/DAG retrieval with semantic & keyword search over study notes and uploaded learning documents. Strictly scoped to the authenticated user.
- **Theme System**: Light, Dark, and System theme switcher persisted in `localStorage` with zero-flash initial boot.

---

## 2. Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query, Axios, React Hook Form, Zod, Recharts, Lucide React
- **Backend**: Node.js 22, Express, TypeScript, JWT (`jsonwebtoken`), `crypto.scryptSync`, `express-rate-limit`, `@google/genai`
- **Database**: Neon PostgreSQL (`pg` connection pool + `pgvector` extension with versioned SQL migrations; isolated `node:sqlite` `:memory:` runner for automated tests)
- **Testing**: `node:test` + `tsx` against isolated in-memory test databases

---

## 3. Folder Structure

```text
studyflow-ai/
├── public/
│   └── logo.svg
├── server/
│   ├── api/v1/
│   │   └── router.ts            # Versioned REST API endpoints
│   ├── core/
│   │   ├── errors.ts            # Centralized HTTP error classes
│   │   ├── middleware.ts        # Auth, Mentor RBAC, error handler
│   │   └── security.ts          # Scrypt hashing & JWT tokens
│   ├── db/
│   │   ├── database.ts          # Async Neon PostgreSQL pool & isolated test DB adapter
│   │   ├── migrations.ts        # Versioned normalized SQL + pgvector migrations
│   │   └── seed.ts              # Demo mentor, 3 learners, 5 goals, 17 topics, 33 sessions
│   ├── services/
│   │   ├── aiService.ts         # User-scoped RAG pipeline & conversation memory
│   │   ├── authService.ts       # Registration, login, token refresh
│   │   ├── configService.ts     # Dynamic business rules DB config
│   │   ├── documentService.ts   # Learning document chunking & embeddings
│   │   ├── goalService.ts       # Goal CRUD & ownership verification
│   │   ├── mentorService.ts     # Cohort search & learner inspection
│   │   ├── prerequisiteService.ts # DAG validation & dynamic unlock engine
│   │   ├── progressService.ts   # Overview, weekly & 6-week SQL aggregations
│   │   ├── sessionService.ts    # Session CRUD & dynamic validation
│   │   └── topicService.ts      # Topic CRUD, complete, reopen
│   ├── app.ts                   # Express app factory
│   └── config.ts                # Environment configuration
├── src/
│   ├── components/
│   │   ├── ai-assistant/        # FloatingAssistant chat drawer
│   │   ├── charts/              # Recharts weekly, 6-week, goal charts
│   │   ├── common/              # ConfirmDialog, EmptyState, Skeleton, StatusIndicator
│   │   ├── goals/               # GoalModal
│   │   ├── layout/              # AppLayout, ProtectedRoute
│   │   ├── sessions/            # SessionModal
│   │   └── topics/              # PrerequisiteGraph SVG & TopicModal
│   ├── contexts/                # AuthContext, ThemeContext, ToastContext
│   ├── pages/                   # Auth, Dashboard, Goals, Sessions, Assistant, Mentor, Settings
│   ├── services/                # Axios API client & domain services
│   ├── types/                   # Shared TypeScript interfaces
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── tests/
│   └── studyflow.test.ts        # 20 automated backend & security tests
├── server.ts                    # Full-stack server entrypoint (port 3000)
├── .env.example
├── package.json
└── README.md
```

---

## 4. Database Schema

Normalized PostgreSQL tables created via `server/db/migrations.ts`:

1. `users` (`id`, `email`, `name`, `password_hash`, `role`, `created_at`)
2. `goals` (`id`, `owner_id`, `title`, `description`, `category`, `target_date`, `status`, `created_at`)
3. `topics` (`id`, `goal_id`, `title`, `description`, `estimated_minutes`, `is_completed`, `completed_at`, `created_at`)
4. `topic_prerequisites` (`topic_id`, `prerequisite_id`, `created_at`, `CHECK (topic_id <> prerequisite_id)`)
5. `study_sessions` (`id`, `user_id`, `goal_id`, `topic_id`, `study_date`, `minutes`, `notes`, `created_at`, `updated_at`)
6. `app_configurations` (`id`, `min_session_minutes`, `max_session_minutes`, `max_prerequisites_per_topic`, `updated_by`, `updated_at`)
7. `chat_conversations` (`id`, `user_id`, `title`, `created_at`, `updated_at`)
8. `chat_messages` (`id`, `conversation_id`, `role`, `content`, `sources_json`, `created_at`)
9. `learning_documents` (`id`, `user_id`, `goal_id`, `title`, `content`, `created_at`)
10. `document_chunks` (`id`, `document_id`, `user_id`, `chunk_text`, `embedding_json`, `embedding vector`, `created_at`)

---

## 5. Prerequisite Engine Logic

Topic availability is never cached as a stale boolean column. Whenever topics are queried or mutated, `prerequisiteService.ts` computes:

- `completed` if `is_completed = TRUE`
- `available` if `is_completed = FALSE` and all prerequisites have `is_completed = TRUE`
- `locked` if one or more prerequisites have `is_completed = FALSE`, returning the exact `missingPrerequisites` list.

Cycle prevention uses Depth-First Search (DFS) reachability over `topic_prerequisites` before committing any edge update inside a database transaction.

---

## 6. RAG Architecture

1. **Authenticated Scope**: Queries filter strictly on `req.user.id`.
2. **Exact SQL & DAG Retrieval**: Fetches real goal completion percentages, live prerequisite unlock/missing lists, and weekly/6-week study aggregates.
3. **Hybrid Semantic & Keyword Search**: Scores session notes and `document_chunks` using `gemini-embedding-2` embeddings (`pgvector` / cosine similarity) plus keyword overlap.
4. **Grounded Generation**: Prompts `gemini-4-hydrogen` via `@google/genai` on the server with instructions never to fabricate statistics or claim locked topics are available, returning transparent source citations.

---

## 7. Environment Setup & Running

1. Copy `.env.example` to `.env` and configure `DATABASE_URL` (your Neon PostgreSQL connection string), `GEMINI_API_KEY`, and `JWT_SECRET` / `JWT_REFRESH_SECRET`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server (runs backend API + Vite frontend on port 3000 and auto-runs PostgreSQL migrations + demo seed):
   ```bash
   npm run dev
   ```
4. Build & start production server:
   ```bash
   npm run build
   npm start
   ```
5. Run automated tests (uses isolated `:memory:` database, never touches production Neon data):
   ```bash
   npm test
   ```

### Deploying to Vercel

Vercel serves the Vite frontend from `dist` and the API through `api/[...path].ts`.
In the Vercel project settings, add `DATABASE_URL`, `JWT_SECRET`, and
`JWT_REFRESH_SECRET`; add `GEMINI_API_KEY` to enable the AI assistant. Set
`APP_URL` to your deployed site URL if you need to restrict API CORS. Redeploy
after adding or changing environment variables.

---

## 8. Demo Credentials (Development Only)

- **Mentor / Admin**: `mentor@studyflow.ai` / `MentorPass123!`
- **Primary Learner**: `alex@studyflow.ai` / `LearnerPass123!`
- **Additional Learners**: `priya@studyflow.ai` / `LearnerPass123!`, `marcus@studyflow.ai` / `LearnerPass123!`
