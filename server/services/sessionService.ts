import { v4 as uuidv4 } from 'uuid';
import { getDb, toIsoString } from '../db/database.ts';
import { ForbiddenError, NotFoundError, ValidationError } from '../core/errors.ts';
import { getAppConfiguration } from './configService.ts';

export interface StudySessionRecord {
  id: string;
  userId: string;
  goalId: string;
  goalTitle: string;
  topicId: string;
  topicTitle: string;
  studyDate: string;
  minutes: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function validateStudyDate(studyDate: string): string {
  const trimmed = (studyDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new ValidationError('Study date must be in YYYY-MM-DD format');
  }
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new ValidationError('Invalid calendar date');
  }
  if (trimmed > getTodayDateString()) {
    throw new ValidationError('Study date cannot be in the future');
  }
  return trimmed;
}

async function validateSessionMinutes(minutes: number): Promise<number> {
  const cfg = await getAppConfiguration();
  if (!Number.isInteger(minutes)) {
    throw new ValidationError('Study duration must be a whole number of minutes');
  }
  if (minutes < cfg.minSessionMinutes) {
    throw new ValidationError(
      `Study session must be at least ${cfg.minSessionMinutes} minutes`,
      { minSessionMinutes: cfg.minSessionMinutes }
    );
  }
  if (minutes > cfg.maxSessionMinutes) {
    throw new ValidationError(
      `Study session cannot exceed ${cfg.maxSessionMinutes} minutes`,
      { maxSessionMinutes: cfg.maxSessionMinutes }
    );
  }
  return minutes;
}

async function verifyTopicBelongsToUser(
  topicId: string,
  goalId: string,
  userId: string
): Promise<void> {
  const db = getDb();
  const row = await db.queryOne<{ id: string; goal_id: string; owner_id: string }>(
    `SELECT t.id, t.goal_id, g.owner_id
     FROM topics t
     INNER JOIN goals g ON t.goal_id = g.id
     WHERE t.id = $1`,
    [topicId]
  );

  if (!row) {
    throw new NotFoundError('Selected topic not found');
  }
  if (row.owner_id !== userId) {
    throw new ForbiddenError('You can only log sessions for your own study goals');
  }
  if (row.goal_id !== goalId) {
    throw new ValidationError('Selected topic does not belong to the selected goal');
  }
}

export async function listSessionsForUser(
  userId: string,
  filters?: { goalId?: string; topicId?: string; startDate?: string; endDate?: string }
): Promise<{ sessions: StudySessionRecord[]; totalMinutes: number }> {
  const db = getDb();
  const conditions: string[] = ['s.user_id = $1'];
  const params: Array<string> = [userId];

  if (filters?.goalId) {
    params.push(filters.goalId);
    conditions.push(`s.goal_id = $${params.length}`);
  }
  if (filters?.topicId) {
    params.push(filters.topicId);
    conditions.push(`s.topic_id = $${params.length}`);
  }
  if (filters?.startDate) {
    params.push(filters.startDate);
    conditions.push(`s.study_date >= $${params.length}`);
  }
  if (filters?.endDate) {
    params.push(filters.endDate);
    conditions.push(`s.study_date <= $${params.length}`);
  }

  const sql = `
    SELECT s.id, s.user_id, s.goal_id, g.title AS goal_title, s.topic_id, t.title AS topic_title,
           s.study_date, s.minutes, s.notes, s.created_at, s.updated_at
    FROM study_sessions s
    INNER JOIN goals g ON s.goal_id = g.id
    INNER JOIN topics t ON s.topic_id = t.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY s.study_date DESC, s.created_at DESC
  `;

  const rows = await db.query<{
    id: string;
    user_id: string;
    goal_id: string;
    goal_title: string;
    topic_id: string;
    topic_title: string;
    study_date: string;
    minutes: number;
    notes: string;
    created_at: string | Date;
    updated_at: string | Date;
  }>(sql, params);

  const sessions: StudySessionRecord[] = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    goalId: r.goal_id,
    goalTitle: r.goal_title,
    topicId: r.topic_id,
    topicTitle: r.topic_title,
    studyDate: r.study_date,
    minutes: Number(r.minutes),
    notes: r.notes,
    createdAt: toIsoString(r.created_at) || '',
    updatedAt: toIsoString(r.updated_at) || '',
  }));

  const totalMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0);
  return { sessions, totalMinutes };
}

export async function createStudySession(
  userId: string,
  input: {
    goalId: string;
    topicId: string;
    studyDate: string;
    minutes: number;
    notes?: string;
  }
): Promise<StudySessionRecord> {
  const studyDate = validateStudyDate(input.studyDate);
  const minutes = await validateSessionMinutes(input.minutes);
  await verifyTopicBelongsToUser(input.topicId, input.goalId, userId);

  const id = uuidv4();
  const now = new Date().toISOString();
  const notes = (input.notes || '').trim();
  const db = getDb();

  await db.execute(
    `INSERT INTO study_sessions (id, user_id, goal_id, topic_id, study_date, minutes, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, userId, input.goalId, input.topicId, studyDate, minutes, notes, now, now]
  );

  const { sessions } = await listSessionsForUser(userId);
  return sessions.find((s) => s.id === id)!;
}

export async function updateStudySession(
  sessionId: string,
  userId: string,
  input: {
    goalId?: string;
    topicId?: string;
    studyDate?: string;
    minutes?: number;
    notes?: string;
  }
): Promise<StudySessionRecord> {
  const db = getDb();
  const existing = await db.queryOne<{
    id: string;
    user_id: string;
    goal_id: string;
    topic_id: string;
    study_date: string;
    minutes: number;
    notes: string;
  }>(
    'SELECT id, user_id, goal_id, topic_id, study_date, minutes, notes FROM study_sessions WHERE id = $1',
    [sessionId]
  );

  if (!existing) {
    throw new NotFoundError('Study session not found');
  }
  if (existing.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to edit this study session');
  }

  const nextGoalId = input.goalId ?? existing.goal_id;
  const nextTopicId = input.topicId ?? existing.topic_id;
  const nextDate =
    input.studyDate !== undefined ? validateStudyDate(input.studyDate) : existing.study_date;
  const nextMinutes =
    input.minutes !== undefined
      ? await validateSessionMinutes(input.minutes)
      : Number(existing.minutes);
  const nextNotes = input.notes !== undefined ? input.notes.trim() : existing.notes;

  await verifyTopicBelongsToUser(nextTopicId, nextGoalId, userId);

  const now = new Date().toISOString();
  await db.execute(
    `UPDATE study_sessions
     SET goal_id = $1, topic_id = $2, study_date = $3, minutes = $4, notes = $5, updated_at = $6
     WHERE id = $7 AND user_id = $8`,
    [nextGoalId, nextTopicId, nextDate, nextMinutes, nextNotes, now, sessionId, userId]
  );

  const { sessions } = await listSessionsForUser(userId);
  return sessions.find((s) => s.id === sessionId)!;
}

export async function deleteStudySession(sessionId: string, userId: string): Promise<void> {
  const db = getDb();
  const existing = await db.queryOne<{ id: string; user_id: string }>(
    'SELECT id, user_id FROM study_sessions WHERE id = $1',
    [sessionId]
  );

  if (!existing) {
    throw new NotFoundError('Study session not found');
  }
  if (existing.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this study session');
  }

  await db.execute('DELETE FROM study_sessions WHERE id = $1 AND user_id = $2', [
    sessionId,
    userId,
  ]);
}
