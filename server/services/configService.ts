import { getDb, toIsoString } from '../db/database.ts';
import { ValidationError } from '../core/errors.ts';

export interface AppConfiguration {
  minSessionMinutes: number;
  maxSessionMinutes: number;
  maxPrerequisitesPerTopic: number;
  updatedBy: string | null;
  updatedAt: string;
}

export async function getAppConfiguration(): Promise<AppConfiguration> {
  const db = getDb();
  const row = await db.queryOne<{
    min_session_minutes: number;
    max_session_minutes: number;
    max_prerequisites_per_topic: number;
    updated_by: string | null;
    updated_at: string | Date;
  }>(
    'SELECT min_session_minutes, max_session_minutes, max_prerequisites_per_topic, updated_by, updated_at FROM app_configurations WHERE id = 1'
  );

  if (!row) {
    await db.execute(
      `INSERT INTO app_configurations (id, min_session_minutes, max_session_minutes, max_prerequisites_per_topic)
       VALUES (1, 5, 480, 5) ON CONFLICT (id) DO NOTHING`
    );
    return {
      minSessionMinutes: 5,
      maxSessionMinutes: 480,
      maxPrerequisitesPerTopic: 5,
      updatedBy: null,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    minSessionMinutes: Number(row.min_session_minutes),
    maxSessionMinutes: Number(row.max_session_minutes),
    maxPrerequisitesPerTopic: Number(row.max_prerequisites_per_topic),
    updatedBy: row.updated_by,
    updatedAt: toIsoString(row.updated_at) || new Date().toISOString(),
  };
}

export async function updateAppConfiguration(
  actorId: string,
  input: {
    minSessionMinutes?: number;
    maxSessionMinutes?: number;
    maxPrerequisitesPerTopic?: number;
  }
): Promise<AppConfiguration> {
  const current = await getAppConfiguration();
  const nextMin = input.minSessionMinutes ?? current.minSessionMinutes;
  const nextMax = input.maxSessionMinutes ?? current.maxSessionMinutes;
  const nextMaxPrereqs = input.maxPrerequisitesPerTopic ?? current.maxPrerequisitesPerTopic;

  if (!Number.isInteger(nextMin) || nextMin < 1 || nextMin > 1440) {
    throw new ValidationError('Minimum session minutes must be an integer between 1 and 1440');
  }
  if (!Number.isInteger(nextMax) || nextMax < 1 || nextMax > 1440) {
    throw new ValidationError('Maximum session minutes must be an integer between 1 and 1440');
  }
  if (nextMin > nextMax) {
    throw new ValidationError('Minimum session minutes cannot exceed maximum session minutes');
  }
  if (!Number.isInteger(nextMaxPrereqs) || nextMaxPrereqs < 0 || nextMaxPrereqs > 50) {
    throw new ValidationError('Maximum prerequisites per topic must be an integer between 0 and 50');
  }

  const db = getDb();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE app_configurations
     SET min_session_minutes = $1, max_session_minutes = $2, max_prerequisites_per_topic = $3, updated_by = $4, updated_at = $5
     WHERE id = 1`,
    [nextMin, nextMax, nextMaxPrereqs, actorId, now]
  );

  return getAppConfiguration();
}
