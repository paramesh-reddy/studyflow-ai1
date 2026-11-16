import { v4 as uuidv4 } from 'uuid';
import { getDb, toIsoString } from '../db/database.ts';
import { ForbiddenError, NotFoundError, ValidationError } from '../core/errors.ts';
import { computeGoalTopicsWithStatus } from './prerequisiteService.ts';

export type GoalStatus = 'active' | 'completed' | 'paused';

export interface GoalRecord {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  targetDate: string | null;
  status: GoalStatus;
  createdAt: string;
}

export interface GoalWithMetrics extends GoalRecord {
  totalTopics: number;
  completedTopics: number;
  availableTopics: number;
  lockedTopics: number;
  progressPercentage: number;
  totalMinutesStudied: number;
}

function mapGoalRow(row: {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  target_date: string | null;
  status: GoalStatus;
  created_at: string | Date;
}): GoalRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    category: row.category,
    targetDate: row.target_date,
    status: row.status,
    createdAt: toIsoString(row.created_at) || '',
  };
}

export async function listGoalsForUser(userId: string): Promise<GoalWithMetrics[]> {
  const db = getDb();
  const rows = await db.query<{
    id: string;
    owner_id: string;
    title: string;
    description: string;
    category: string;
    target_date: string | null;
    status: GoalStatus;
    created_at: string | Date;
  }>(
    'SELECT id, owner_id, title, description, category, target_date, status, created_at FROM goals WHERE owner_id = $1 ORDER BY created_at DESC',
    [userId]
  );

  const sessionAgg = await db.query<{ goal_id: string; total_minutes: string | number }>(
    'SELECT goal_id, COALESCE(SUM(minutes), 0) AS total_minutes FROM study_sessions WHERE user_id = $1 GROUP BY goal_id',
    [userId]
  );
  const minutesMap = new Map(sessionAgg.map((r) => [r.goal_id, Number(r.total_minutes)]));

  return Promise.all(
    rows.map(async (row) => {
      const goal = mapGoalRow(row);
      const topics = await computeGoalTopicsWithStatus(goal.id);
      const totalTopics = topics.length;
      const completedTopics = topics.filter((t) => t.status === 'completed').length;
      const availableTopics = topics.filter((t) => t.status === 'available').length;
      const lockedTopics = topics.filter((t) => t.status === 'locked').length;
      const progressPercentage =
        totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      return {
        ...goal,
        totalTopics,
        completedTopics,
        availableTopics,
        lockedTopics,
        progressPercentage,
        totalMinutesStudied: minutesMap.get(goal.id) || 0,
      };
    })
  );
}

export async function getGoalForUser(
  goalId: string,
  requesterId: string,
  allowAnyOwner: boolean = false
): Promise<GoalWithMetrics> {
  const db = getDb();
  const row = await db.queryOne<{
    id: string;
    owner_id: string;
    title: string;
    description: string;
    category: string;
    target_date: string | null;
    status: GoalStatus;
    created_at: string | Date;
  }>(
    'SELECT id, owner_id, title, description, category, target_date, status, created_at FROM goals WHERE id = $1',
    [goalId]
  );

  if (!row) {
    throw new NotFoundError('Study goal not found');
  }
  if (!allowAnyOwner && row.owner_id !== requesterId) {
    throw new ForbiddenError('You do not have access to this study goal');
  }

  const goal = mapGoalRow(row);
  const topics = await computeGoalTopicsWithStatus(goal.id);
  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.status === 'completed').length;
  const availableTopics = topics.filter((t) => t.status === 'available').length;
  const lockedTopics = topics.filter((t) => t.status === 'locked').length;
  const progressPercentage =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const sessionRow = await db.queryOne<{ total_minutes: string | number }>(
    'SELECT COALESCE(SUM(minutes), 0) AS total_minutes FROM study_sessions WHERE goal_id = $1',
    [goal.id]
  );

  return {
    ...goal,
    totalTopics,
    completedTopics,
    availableTopics,
    lockedTopics,
    progressPercentage,
    totalMinutesStudied: Number(sessionRow?.total_minutes || 0),
  };
}

export async function createGoal(
  userId: string,
  input: {
    title: string;
    description?: string;
    category?: string;
    targetDate?: string | null;
    status?: GoalStatus;
  }
): Promise<GoalWithMetrics> {
  const title = (input.title || '').trim();
  if (title.length < 2 || title.length > 140) {
    throw new ValidationError('Goal title must be between 2 and 140 characters');
  }

  const description = (input.description || '').trim();
  const category = (input.category || 'General').trim() || 'General';
  const targetDate = input.targetDate ? input.targetDate.trim() : null;
  const status: GoalStatus = input.status || 'active';

  if (!['active', 'completed', 'paused'].includes(status)) {
    throw new ValidationError('Invalid goal status');
  }

  const db = getDb();
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  await db.execute(
    'INSERT INTO goals (id, owner_id, title, description, category, target_date, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, userId, title, description, category, targetDate, status, createdAt]
  );

  return getGoalForUser(id, userId);
}

export async function updateGoal(
  goalId: string,
  userId: string,
  input: {
    title?: string;
    description?: string;
    category?: string;
    targetDate?: string | null;
    status?: GoalStatus;
  }
): Promise<GoalWithMetrics> {
  const existing = await getGoalForUser(goalId, userId);

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  if (title.length < 2 || title.length > 140) {
    throw new ValidationError('Goal title must be between 2 and 140 characters');
  }

  const description = input.description !== undefined ? input.description.trim() : existing.description;
  const category = input.category !== undefined ? input.category.trim() || 'General' : existing.category;
  const targetDate =
    input.targetDate !== undefined
      ? input.targetDate
        ? input.targetDate.trim()
        : null
      : existing.targetDate;
  const status = input.status !== undefined ? input.status : existing.status;

  if (!['active', 'completed', 'paused'].includes(status)) {
    throw new ValidationError('Invalid goal status');
  }

  const db = getDb();
  await db.execute(
    'UPDATE goals SET title = $1, description = $2, category = $3, target_date = $4, status = $5 WHERE id = $6 AND owner_id = $7',
    [title, description, category, targetDate, status, goalId, userId]
  );

  return getGoalForUser(goalId, userId);
}

export async function deleteGoal(goalId: string, userId: string): Promise<void> {
  await getGoalForUser(goalId, userId);
  const db = getDb();
  await db.execute('DELETE FROM goals WHERE id = $1 AND owner_id = $2', [goalId, userId]);
}
