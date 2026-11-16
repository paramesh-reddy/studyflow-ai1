import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database.ts';
import { hashPassword } from '../core/security.ts';

function daysAgoIso(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function daysAheadIso(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export async function seedDatabaseIfEmpty(): Promise<boolean> {
  const db = getDb();
  const countRow = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) AS cnt FROM users');
  if (Number(countRow?.cnt || 0) > 0) {
    return false;
  }

  const now = new Date().toISOString();
  const mentorId = uuidv4();
  const alexId = uuidv4();
  const priyaId = uuidv4();
  const marcusId = uuidv4();

  const mentorHash = hashPassword('MentorPass123!');
  const learnerHash = hashPassword('LearnerPass123!');

  await db.transaction(async (tx) => {
    const insertUserSql =
      'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)';
    await tx.execute(insertUserSql, [mentorId, 'mentor@studyflow.ai', 'Dr. Elena Vance', mentorHash, 'mentor', now]);
    await tx.execute(insertUserSql, [alexId, 'alex@studyflow.ai', 'Alex Rivera', learnerHash, 'learner', now]);
    await tx.execute(insertUserSql, [priyaId, 'priya@studyflow.ai', 'Priya Nair', learnerHash, 'learner', now]);
    await tx.execute(insertUserSql, [marcusId, 'marcus@studyflow.ai', 'Marcus Chen', learnerHash, 'learner', now]);

    await tx.execute(
      `UPDATE app_configurations
       SET min_session_minutes = $1, max_session_minutes = $2, max_prerequisites_per_topic = $3, updated_by = $4, updated_at = $5
       WHERE id = 1`,
      [5, 480, 5, mentorId, now]
    );

    const goalFullStackId = uuidv4();
    const goalPythonAiId = uuidv4();
    const goalDataSciId = uuidv4();

    const insertGoalSql =
      'INSERT INTO goals (id, owner_id, title, description, category, target_date, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
    await tx.execute(insertGoalSql, [
      goalFullStackId,
      alexId,
      'Full Stack Development',
      'Master TypeScript, React architecture, REST APIs, and production relational database modeling.',
      'Software Engineering',
      daysAheadIso(45),
      'active',
      now,
    ]);
    await tx.execute(insertGoalSql, [
      goalPythonAiId,
      alexId,
      'Python and Generative AI',
      'Progress from core Python and async FastAPI services to building RAG pipelines and LLM agents.',
      'Artificial Intelligence',
      daysAheadIso(30),
      'active',
      now,
    ]);
    await tx.execute(insertGoalSql, [
      goalDataSciId,
      alexId,
      'Data Science and Machine Learning',
      'Build statistical intuition, feature engineering workflows, and supervised ML models.',
      'Data Science',
      daysAheadIso(75),
      'active',
      now,
    ]);

    const insertTopicSql =
      'INSERT INTO topics (id, goal_id, title, description, estimated_minutes, is_completed, completed_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';

    // Goal 1
    const tHtmlCss = uuidv4();
    const tTsFoundations = uuidv4();
    const tReactState = uuidv4();
    const tFullStackCapstone = uuidv4();

    await tx.execute(insertTopicSql, [tHtmlCss, goalFullStackId, 'HTML, CSS & Responsive Layout', 'Semantic markup, Flexbox, CSS Grid, and WCAG accessibility.', 120, true, `${daysAgoIso(28)}T12:00:00Z`, '2026-10-01T10:00:00Z']);
    await tx.execute(insertTopicSql, [tTsFoundations, goalFullStackId, 'TypeScript Foundations', 'Strict type systems, generics, union narrowing, and async patterns.', 180, true, `${daysAgoIso(18)}T12:00:00Z`, '2026-10-02T10:00:00Z']);
    await tx.execute(insertTopicSql, [tReactState, goalFullStackId, 'React & State Architecture', 'Hooks, TanStack Query, React Router, and form validation with Zod.', 240, false, null, '2026-10-03T10:00:00Z']);
    await tx.execute(insertTopicSql, [tFullStackCapstone, goalFullStackId, 'Production API & Deployment', 'REST endpoints, JWT security, database indexing, and CI pipelines.', 300, false, null, '2026-10-04T10:00:00Z']);

    // Goal 2
    const tPyBasics = uuidv4();
    const tAdvPy = uuidv4();
    const tFastApi = uuidv4();
    const tBackendRag = uuidv4();

    await tx.execute(insertTopicSql, [tPyBasics, goalPythonAiId, 'Python Basics', 'Syntax, data structures, virtual environments, and modular packages.', 150, true, `${daysAgoIso(32)}T12:00:00Z`, '2026-10-05T10:00:00Z']);
    await tx.execute(insertTopicSql, [tAdvPy, goalPythonAiId, 'Advanced Python', 'Decorators, generators, typing, async/await, and pytest testing.', 180, true, `${daysAgoIso(14)}T12:00:00Z`, '2026-10-06T10:00:00Z']);
    await tx.execute(insertTopicSql, [tFastApi, goalPythonAiId, 'FastAPI & REST Services', 'Pydantic schemas, dependency injection, JWT auth, and OpenAPI docs.', 210, false, null, '2026-10-07T10:00:00Z']);
    await tx.execute(insertTopicSql, [tBackendRag, goalPythonAiId, 'Backend RAG Project', 'Embeddings, vector similarity retrieval, prompt grounding, and citations.', 260, false, null, '2026-10-08T10:00:00Z']);

    // Goal 3
    const tStatsProb = uuidv4();
    const tPandasNumpy = uuidv4();
    const tFeatureEng = uuidv4();
    const tSupervisedMl = uuidv4();

    await tx.execute(insertTopicSql, [tStatsProb, goalDataSciId, 'Statistics & Probability', 'Distributions, hypothesis testing, Bayes theorem, and confidence intervals.', 160, true, `${daysAgoIso(22)}T12:00:00Z`, '2026-10-09T10:00:00Z']);
    await tx.execute(insertTopicSql, [tPandasNumpy, goalDataSciId, 'NumPy & Pandas Data Wrangling', 'Vectorized computation, joins, window aggregations, and missing-data cleanup.', 180, false, null, '2026-10-10T10:00:00Z']);
    await tx.execute(insertTopicSql, [tFeatureEng, goalDataSciId, 'Feature Engineering & EDA', 'Encoding, scaling, leakage prevention, and exploratory visualizations.', 180, false, null, '2026-10-11T10:00:00Z']);
    await tx.execute(insertTopicSql, [tSupervisedMl, goalDataSciId, 'Supervised ML & Evaluation', 'Linear/tree models, cross-validation, ROC-AUC, and hyperparameter tuning.', 240, false, null, '2026-10-12T10:00:00Z']);

    const insertPrereqSql =
      'INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES ($1, $2)';
    await tx.execute(insertPrereqSql, [tTsFoundations, tHtmlCss]);
    await tx.execute(insertPrereqSql, [tReactState, tHtmlCss]);
    await tx.execute(insertPrereqSql, [tReactState, tTsFoundations]);
    await tx.execute(insertPrereqSql, [tFullStackCapstone, tReactState]);

    await tx.execute(insertPrereqSql, [tAdvPy, tPyBasics]);
    await tx.execute(insertPrereqSql, [tFastApi, tAdvPy]);
    await tx.execute(insertPrereqSql, [tBackendRag, tFastApi]);

    await tx.execute(insertPrereqSql, [tPandasNumpy, tStatsProb]);
    await tx.execute(insertPrereqSql, [tFeatureEng, tStatsProb]);
    await tx.execute(insertPrereqSql, [tFeatureEng, tPandasNumpy]);
    await tx.execute(insertPrereqSql, [tSupervisedMl, tFeatureEng]);

    const insertSessionSql =
      `INSERT INTO study_sessions (id, user_id, goal_id, topic_id, study_date, minutes, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

    const sampleSessions: Array<[string, string, number, number, string]> = [
      [goalPythonAiId, tPyBasics, 40, 65, 'Reviewed list comprehensions, dicts, and virtual env setup.'],
      [goalFullStackId, tHtmlCss, 38, 75, 'Built responsive CSS Grid layouts and tested mobile breakpoints.'],
      [goalPythonAiId, tPyBasics, 37, 80, 'Practiced file I/O, exception handling, and unit tests.'],
      [goalFullStackId, tHtmlCss, 35, 55, 'Completed semantic landmark audit and keyboard focus order.'],
      [goalDataSciId, tStatsProb, 34, 70, 'Worked through normal vs binomial distributions and z-scores.'],
      [goalPythonAiId, tPyBasics, 32, 90, 'Finished Python Basics exercises and refactored utility module.'],
      [goalFullStackId, tHtmlCss, 30, 60, 'Polished dark mode tokens and accessible contrast ratios.'],
      [goalDataSciId, tStatsProb, 28, 85, 'Practiced p-values, t-tests, and Type I/II error tradeoffs.'],
      [goalFullStackId, tTsFoundations, 27, 95, 'Learned discriminated unions, type guards, and utility types.'],
      [goalPythonAiId, tAdvPy, 25, 70, 'Built custom decorators and context managers for timing logs.'],
      [goalDataSciId, tStatsProb, 23, 60, 'Completed Bayes theorem conditional probability problem set.'],
      [goalFullStackId, tTsFoundations, 21, 110, 'Typed async API client responses with generics and Zod schemas.'],
      [goalPythonAiId, tAdvPy, 19, 85, 'Implemented async gather pipelines and pytest fixtures.'],
      [goalFullStackId, tTsFoundations, 18, 75, 'Wrapped up TypeScript Foundations capstone quiz cleanly.'],
      [goalDataSciId, tPandasNumpy, 17, 65, 'Practiced vectorized NumPy broadcasting and boolean masks.'],
      [goalPythonAiId, tAdvPy, 15, 95, 'Deep dive into generators, itertools, and memory efficiency.'],
      [goalFullStackId, tReactState, 13, 80, 'Set up TanStack Query caching and optimistic UI mutations.'],
      [goalDataSciId, tPandasNumpy, 12, 70, 'Worked on groupby aggregations and multi-index DataFrames.'],
      [goalPythonAiId, tFastApi, 10, 60, 'Read Pydantic v2 model validation and router dependency docs.'],
      [goalFullStackId, tReactState, 9, 90, 'Built reusable modal forms with React Hook Form + Zod resolver.'],
      [goalDataSciId, tPandasNumpy, 8, 50, 'Cleaned messy CSV timestamps and handled missing numeric values.'],
      [goalFullStackId, tReactState, 6, 85, 'Struggled slightly with nested query invalidation keys; resolved with queryClient.invalidateQueries.'],
      [goalPythonAiId, tFastApi, 5, 75, 'Implemented JWT bearer verification dependency and role checks.'],
      [goalFullStackId, tReactState, 4, 65, 'Built dynamic prerequisite checklist component in React.'],
      [goalDataSciId, tPandasNumpy, 3, 55, 'Practiced merge/join edge cases and pivot tables in Pandas.'],
      [goalPythonAiId, tFastApi, 2, 100, 'Created OpenAPI endpoint tests and error response schemas.'],
      [goalFullStackId, tReactState, 2, 45, 'Reviewed React Router v6 nested outlet layouts and dark mode.'],
      [goalPythonAiId, tFastApi, 1, 80, 'Debugged async DB session lifecycle and status codes.'],
      [goalFullStackId, tReactState, 1, 70, 'Connected Recharts weekly analytics cards to backend API.'],
      [goalDataSciId, tPandasNumpy, 0, 50, 'Reviewed window rolling averages for time-series features.'],
    ];

    for (const [gId, tId, dAgo, mins, notes] of sampleSessions) {
      await tx.execute(insertSessionSql, [uuidv4(), alexId, gId, tId, daysAgoIso(dAgo), mins, notes, now, now]);
    }

    // Seed Priya & Marcus
    const priyaGoal = uuidv4();
    await tx.execute(insertGoalSql, [
      priyaGoal,
      priyaId,
      'Cloud Architecture & Kubernetes',
      'Containers, Kubernetes orchestration, observability, and cloud security.',
      'Cloud & DevOps',
      daysAheadIso(40),
      'active',
      now,
    ]);
    const pT1 = uuidv4();
    const pT2 = uuidv4();
    const pT3 = uuidv4();
    await tx.execute(insertTopicSql, [pT1, priyaGoal, 'Docker & Container Internals', 'Layers, multi-stage builds, and networking.', 120, true, `${daysAgoIso(10)}T12:00:00Z`, '2026-10-15T10:00:00Z']);
    await tx.execute(insertTopicSql, [pT2, priyaGoal, 'Kubernetes Core Workloads', 'Pods, Deployments, Services, and ConfigMaps.', 180, true, `${daysAgoIso(3)}T12:00:00Z`, '2026-10-16T10:00:00Z']);
    await tx.execute(insertTopicSql, [pT3, priyaGoal, 'Helm & Production Ingress', 'TLS termination, autoscaling, and Helm charts.', 180, false, null, '2026-10-17T10:00:00Z']);
    await tx.execute(insertPrereqSql, [pT2, pT1]);
    await tx.execute(insertPrereqSql, [pT3, pT2]);
    await tx.execute(insertSessionSql, [uuidv4(), priyaId, priyaGoal, pT2, daysAgoIso(4), 120, 'Configured readiness probes and rolling update strategies.', now, now]);
    await tx.execute(insertSessionSql, [uuidv4(), priyaId, priyaGoal, pT3, daysAgoIso(1), 90, 'Started Helm templating and ingress controller routing.', now, now]);

    const marcusGoal = uuidv4();
    await tx.execute(insertGoalSql, [
      marcusGoal,
      marcusId,
      'Algorithms & System Design',
      'Graph algorithms, dynamic programming, and distributed caching.',
      'Computer Science',
      daysAheadIso(60),
      'active',
      now,
    ]);
    const mT1 = uuidv4();
    const mT2 = uuidv4();
    await tx.execute(insertTopicSql, [mT1, marcusGoal, 'Trees & Graph Traversal', 'BFS, DFS, topological sort, and shortest paths.', 180, true, `${daysAgoIso(7)}T12:00:00Z`, '2026-10-18T10:00:00Z']);
    await tx.execute(insertTopicSql, [mT2, marcusGoal, 'Distributed Caching & Sharding', 'Consistent hashing, Redis eviction, and cache invalidation.', 200, false, null, '2026-10-19T10:00:00Z']);
    await tx.execute(insertPrereqSql, [mT2, mT1]);
    await tx.execute(insertSessionSql, [uuidv4(), marcusId, marcusGoal, mT1, daysAgoIso(7), 95, 'Implemented Kahn topological sort for DAG cycle detection.', now, now]);

    // Sample Learning Document for Alex
    const docId = uuidv4();
    const docContent =
      'React & State Architecture Notes: Always separate server state (TanStack Query) from ephemeral UI state. Use Zod schemas with React Hook Form to validate inputs before dispatching API mutations. Remember that Backend RAG Project depends on FastAPI & REST Services, which is currently unlocked because Advanced Python is complete.';
    await tx.execute(
      'INSERT INTO learning_documents (id, user_id, goal_id, title, content, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [docId, alexId, goalFullStackId, 'Frontend State & Study Roadmap Notes', docContent, now]
    );
    await tx.execute(
      'INSERT INTO document_chunks (id, document_id, user_id, chunk_text, embedding_json, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), docId, alexId, docContent, null, now]
    );
  });

  return true;
}
