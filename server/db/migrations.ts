import type { Pool, PoolClient } from 'pg';
import type { DatabaseSync } from 'node:sqlite';

const PG_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('learner', 'mentor')) DEFAULT 'learner',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

  CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General',
    target_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_goals_owner_id ON goals(owner_id);

  CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    estimated_minutes INTEGER NOT NULL DEFAULT 60,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_topics_goal_id ON topics(goal_id);

  CREATE TABLE IF NOT EXISTS topic_prerequisites (
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    prerequisite_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (topic_id, prerequisite_id),
    CHECK (topic_id <> prerequisite_id)
  );

  CREATE INDEX IF NOT EXISTS idx_prereq_topic_id ON topic_prerequisites(topic_id);
  CREATE INDEX IF NOT EXISTS idx_prereq_prereq_id ON topic_prerequisites(prerequisite_id);

  CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    study_date TEXT NOT NULL,
    minutes INTEGER NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_goal_id ON study_sessions(goal_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_topic_id ON study_sessions(topic_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_study_date ON study_sessions(study_date);

  CREATE TABLE IF NOT EXISTS app_configurations (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    min_session_minutes INTEGER NOT NULL DEFAULT 5,
    max_session_minutes INTEGER NOT NULL DEFAULT 480,
    max_prerequisites_per_topic INTEGER NOT NULL DEFAULT 5,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  INSERT INTO app_configurations (id, min_session_minutes, max_session_minutes, max_prerequisites_per_topic)
  VALUES (1, 5, 480, 5)
  ON CONFLICT (id) DO NOTHING;

  CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON chat_conversations(user_id);

  CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON chat_messages(conversation_id);

  CREATE TABLE IF NOT EXISTS learning_documents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_docs_user_id ON learning_documents(user_id);

  CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES learning_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON document_chunks(user_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id);
`;

const SQLITE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('learner', 'mentor')) DEFAULT 'learner',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General',
    target_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_goals_owner_id ON goals(owner_id);

  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    estimated_minutes INTEGER NOT NULL DEFAULT 60,
    is_completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_topics_goal_id ON topics(goal_id);

  CREATE TABLE IF NOT EXISTS topic_prerequisites (
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    prerequisite_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (topic_id, prerequisite_id),
    CHECK (topic_id != prerequisite_id)
  );

  CREATE INDEX IF NOT EXISTS idx_prereq_topic_id ON topic_prerequisites(topic_id);
  CREATE INDEX IF NOT EXISTS idx_prereq_prereq_id ON topic_prerequisites(prerequisite_id);

  CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    study_date TEXT NOT NULL,
    minutes INTEGER NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_goal_id ON study_sessions(goal_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_topic_id ON study_sessions(topic_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_study_date ON study_sessions(study_date);

  CREATE TABLE IF NOT EXISTS app_configurations (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    min_session_minutes INTEGER NOT NULL DEFAULT 5,
    max_session_minutes INTEGER NOT NULL DEFAULT 480,
    max_prerequisites_per_topic INTEGER NOT NULL DEFAULT 5,
    updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO app_configurations (id, min_session_minutes, max_session_minutes, max_prerequisites_per_topic)
  VALUES (1, 5, 480, 5);

  CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON chat_conversations(user_id);

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON chat_messages(conversation_id);

  CREATE TABLE IF NOT EXISTS learning_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_docs_user_id ON learning_documents(user_id);

  CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES learning_documents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON document_chunks(user_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id);
`;

export async function runPgMigrations(pool: Pool): Promise<boolean> {
  const client: PoolClient = await pool.connect();
  let pgvectorEnabled = false;
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const appliedRes = await client.query<{ version: number }>('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(appliedRes.rows.map((r) => r.version));

    if (!appliedVersions.has(1)) {
      await client.query('BEGIN');
      try {
        await client.query(PG_SCHEMA_SQL);
        await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [
          1,
          'initial_pg_schema',
        ]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Migration 2: Enable pgvector extension & vector column if supported by Neon
    if (!appliedVersions.has(2)) {
      try {
        await client.query('BEGIN');
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        await client.query('ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector;');
        await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [
          2,
          'pgvector_support',
        ]);
        await client.query('COMMIT');
        pgvectorEnabled = true;
      } catch {
        await client.query('ROLLBACK');
      }
    } else {
      const extRes = await client.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
      pgvectorEnabled = extRes.rows.length > 0;
    }

    return pgvectorEnabled;
  } finally {
    client.release();
  }
}

export function runSqliteMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedStmt = db.prepare('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(
    (appliedStmt.all() as Array<{ version: number }>).map((row) => row.version)
  );

  if (!appliedVersions.has(1)) {
    db.exec('BEGIN;');
    try {
      db.exec(SQLITE_SCHEMA_SQL);
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(
        1,
        'initial_sqlite_test_schema'
      );
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }
}
