import { getDb, toIsoString } from '../db/database.ts';
import { NotFoundError } from '../core/errors.ts';
import { listGoalsForUser } from './goalService.ts';
import { computeGoalTopicsWithStatus } from './prerequisiteService.ts';
import { listSessionsForUser } from './sessionService.ts';
import { getProgressOverview, getWeeklyAndSixWeekProgress } from './progressService.ts';

export async function listLearnersForMentor(search?: string) {
  const db = getDb();
  const term = (search || '').trim().toLowerCase();

  const rows = term
    ? await db.query<{ id: string; email: string; name: string; role: string; created_at: string | Date }>(
        `SELECT id, email, name, role, created_at
         FROM users
         WHERE role = 'learner' AND (LOWER(name) LIKE $1 OR LOWER(email) LIKE $1)
         ORDER BY created_at DESC`,
        [`%${term}%`]
      )
    : await db.query<{ id: string; email: string; name: string; role: string; created_at: string | Date }>(
        `SELECT id, email, name, role, created_at
         FROM users
         WHERE role = 'learner'
         ORDER BY created_at DESC`
      );

  return Promise.all(
    rows.map(async (learner) => {
      const overview = await getProgressOverview(learner.id);
      return {
        id: learner.id,
        email: learner.email,
        name: learner.name,
        createdAt: toIsoString(learner.created_at) || '',
        totalGoals: overview.totalGoals,
        totalTopics: overview.totalTopics,
        completedTopics: overview.completedTopics,
        lockedTopics: overview.lockedTopics,
        availableTopics: overview.availableTopics,
        totalStudyHours: overview.totalStudyHours,
        overallCompletionPercentage: overview.overallCompletionPercentage,
      };
    })
  );
}

export async function getLearnerDetailForMentor(learnerId: string) {
  const db = getDb();
  const learner = await db.queryOne<{
    id: string;
    email: string;
    name: string;
    role: string;
    created_at: string | Date;
  }>("SELECT id, email, name, role, created_at FROM users WHERE id = $1 AND role = 'learner'", [
    learnerId,
  ]);

  if (!learner) {
    throw new NotFoundError('Learner not found');
  }

  const [overview, weekly, sessionData] = await Promise.all([
    getProgressOverview(learnerId),
    getWeeklyAndSixWeekProgress(learnerId),
    listSessionsForUser(learnerId),
  ]);

  const goalsWithTopics = await Promise.all(
    overview.goals.map(async (goal) => ({
      ...goal,
      topics: await computeGoalTopicsWithStatus(goal.id),
    }))
  );

  return {
    learner: {
      id: learner.id,
      email: learner.email,
      name: learner.name,
      createdAt: toIsoString(learner.created_at) || '',
    },
    overview,
    weekly,
    goals: goalsWithTopics,
    sessions: sessionData.sessions.slice(0, 30),
  };
}

export async function getLearnerGoalsForMentor(learnerId: string) {
  const db = getDb();
  const learner = await db.queryOne<{ id: string }>(
    "SELECT id FROM users WHERE id = $1 AND role = 'learner'",
    [learnerId]
  );
  if (!learner) {
    throw new NotFoundError('Learner not found');
  }
  return listGoalsForUser(learnerId);
}
