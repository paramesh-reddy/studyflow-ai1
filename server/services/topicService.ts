import { v4 as uuidv4 } from 'uuid';
import { getDb, toBool } from '../db/database.ts';
import { ForbiddenError, NotFoundError, ValidationError } from '../core/errors.ts';
import { getGoalForUser } from './goalService.ts';
import {
  computeGoalTopicsWithStatus,
  computeTopicUnlockStatus,
  validatePrerequisiteAssignment,
} from './prerequisiteService.ts';

async function verifyTopicOwnership(
  topicId: string,
  userId: string
): Promise<{
  id: string;
  goalId: string;
  isCompleted: boolean;
  title: string;
  description: string;
  estimatedMinutes: number;
}> {
  const db = getDb();
  const row = await db.queryOne<{
    id: string;
    goal_id: string;
    title: string;
    description: string;
    estimated_minutes: number;
    is_completed: boolean | number;
    owner_id: string;
  }>(
    `SELECT t.id, t.goal_id, t.title, t.description, t.estimated_minutes, t.is_completed, g.owner_id
     FROM topics t
     INNER JOIN goals g ON t.goal_id = g.id
     WHERE t.id = $1`,
    [topicId]
  );

  if (!row) {
    throw new NotFoundError('Topic not found');
  }
  if (row.owner_id !== userId) {
    throw new ForbiddenError('You do not have permission to modify this topic');
  }

  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    description: row.description,
    estimatedMinutes: Number(row.estimated_minutes),
    isCompleted: toBool(row.is_completed),
  };
}

export async function listTopicsForGoal(
  goalId: string,
  userId: string,
  allowAnyOwner: boolean = false
) {
  await getGoalForUser(goalId, userId, allowAnyOwner);
  return computeGoalTopicsWithStatus(goalId);
}

export async function createTopic(
  goalId: string,
  userId: string,
  input: {
    title: string;
    description?: string;
    estimatedMinutes?: number;
    prerequisiteIds?: string[];
  }
) {
  await getGoalForUser(goalId, userId);

  const title = (input.title || '').trim();
  if (title.length < 2 || title.length > 140) {
    throw new ValidationError('Topic title must be between 2 and 140 characters');
  }

  const description = (input.description || '').trim();
  const estimatedMinutes = input.estimatedMinutes ?? 60;
  if (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 5 || estimatedMinutes > 10000) {
    throw new ValidationError('Estimated duration must be between 5 and 10000 minutes');
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.execute(
      'INSERT INTO topics (id, goal_id, title, description, estimated_minutes, is_completed, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, goalId, title, description, estimatedMinutes, false, createdAt]
    );

    if (input.prerequisiteIds && input.prerequisiteIds.length > 0) {
      const validPrereqs = await validatePrerequisiteAssignment(
        id,
        goalId,
        input.prerequisiteIds,
        tx
      );
      for (const prereqId of validPrereqs) {
        await tx.execute(
          'INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES ($1, $2)',
          [id, prereqId]
        );
      }
    }
  });

  const topics = await computeGoalTopicsWithStatus(goalId);
  return topics.find((t) => t.id === id)!;
}

export async function updateTopic(
  topicId: string,
  userId: string,
  input: {
    title?: string;
    description?: string;
    estimatedMinutes?: number;
    prerequisiteIds?: string[];
  }
) {
  const existing = await verifyTopicOwnership(topicId, userId);

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  if (title.length < 2 || title.length > 140) {
    throw new ValidationError('Topic title must be between 2 and 140 characters');
  }

  const description =
    input.description !== undefined ? input.description.trim() : existing.description;
  const estimatedMinutes =
    input.estimatedMinutes !== undefined ? input.estimatedMinutes : existing.estimatedMinutes;
  if (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 5 || estimatedMinutes > 10000) {
    throw new ValidationError('Estimated duration must be between 5 and 10000 minutes');
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.execute(
      'UPDATE topics SET title = $1, description = $2, estimated_minutes = $3 WHERE id = $4',
      [title, description, estimatedMinutes, topicId]
    );

    if (input.prerequisiteIds !== undefined) {
      const validPrereqs = await validatePrerequisiteAssignment(
        topicId,
        existing.goalId,
        input.prerequisiteIds,
        tx
      );
      await tx.execute('DELETE FROM topic_prerequisites WHERE topic_id = $1', [topicId]);
      for (const prereqId of validPrereqs) {
        await tx.execute(
          'INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES ($1, $2)',
          [topicId, prereqId]
        );
      }
    }
  });

  const topics = await computeGoalTopicsWithStatus(existing.goalId);
  return topics.find((t) => t.id === topicId)!;
}

export async function deleteTopic(topicId: string, userId: string): Promise<void> {
  await verifyTopicOwnership(topicId, userId);
  const db = getDb();
  await db.execute('DELETE FROM topics WHERE id = $1', [topicId]);
}

export async function completeTopic(topicId: string, userId: string) {
  const existing = await verifyTopicOwnership(topicId, userId);
  const unlockStatus = await computeTopicUnlockStatus(topicId);

  if (!unlockStatus.isUnlocked) {
    const missingNames = unlockStatus.missingPrerequisites.map((p) => p.title).join(', ');
    throw new ValidationError(
      `Topic is locked. Complete prerequisites first: ${missingNames}`,
      { missingPrerequisites: unlockStatus.missingPrerequisites }
    );
  }

  if (!existing.isCompleted) {
    const db = getDb();
    await db.execute('UPDATE topics SET is_completed = $1, completed_at = $2 WHERE id = $3', [
      true,
      new Date().toISOString(),
      topicId,
    ]);
  }

  return computeGoalTopicsWithStatus(existing.goalId);
}

export async function reopenTopic(topicId: string, userId: string) {
  const existing = await verifyTopicOwnership(topicId, userId);
  const db = getDb();
  await db.execute('UPDATE topics SET is_completed = $1, completed_at = NULL WHERE id = $2', [
    false,
    topicId,
  ]);

  return computeGoalTopicsWithStatus(existing.goalId);
}

export async function getTopicUnlockStatusForUser(
  topicId: string,
  userId: string,
  allowAnyOwner: boolean = false
) {
  if (!allowAnyOwner) {
    await verifyTopicOwnership(topicId, userId);
  }
  return computeTopicUnlockStatus(topicId);
}
