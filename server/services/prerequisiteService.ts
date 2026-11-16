import { getDb, toBool, toIsoString } from '../db/database.ts';
import type { DbClient } from '../db/database.ts';
import { getAppConfiguration } from './configService.ts';
import { NotFoundError, ValidationError } from '../core/errors.ts';

export type TopicStatus = 'locked' | 'available' | 'completed';

export interface PrerequisiteSummary {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TopicUnlockStatus {
  topicId: string;
  status: TopicStatus;
  isUnlocked: boolean;
  isCompleted: boolean;
  prerequisites: PrerequisiteSummary[];
  missingPrerequisites: Array<{ id: string; title: string }>;
}

export async function validatePrerequisiteAssignment(
  topicId: string,
  goalId: string,
  prerequisiteIds: string[],
  client?: DbClient
): Promise<string[]> {
  const uniqueIds = Array.from(new Set(prerequisiteIds.filter(Boolean)));
  const config = await getAppConfiguration();

  if (uniqueIds.length > config.maxPrerequisitesPerTopic) {
    throw new ValidationError(
      `A topic cannot have more than ${config.maxPrerequisitesPerTopic} prerequisites (configured limit)`,
      { maxPrerequisitesPerTopic: config.maxPrerequisitesPerTopic, attempted: uniqueIds.length }
    );
  }

  for (const prereqId of uniqueIds) {
    if (prereqId === topicId) {
      throw new ValidationError('A topic cannot depend on itself as a prerequisite');
    }
  }

  if (uniqueIds.length === 0) {
    return [];
  }

  const db = client || getDb();
  const goalTopics = await db.query<{ id: string }>('SELECT id FROM topics WHERE goal_id = $1', [
    goalId,
  ]);
  const goalTopicSet = new Set(goalTopics.map((t) => t.id));

  for (const prereqId of uniqueIds) {
    if (!goalTopicSet.has(prereqId)) {
      throw new ValidationError('All prerequisite topics must belong to the same study goal');
    }
  }

  const allEdges = await db.query<{ topic_id: string; prerequisite_id: string }>(
    `SELECT tp.topic_id, tp.prerequisite_id
     FROM topic_prerequisites tp
     INNER JOIN topics t ON tp.topic_id = t.id
     WHERE t.goal_id = $1`,
    [goalId]
  );

  const prereqGraph = new Map<string, string[]>();
  for (const edge of allEdges) {
    if (edge.topic_id === topicId) continue;
    const list = prereqGraph.get(edge.topic_id) || [];
    list.push(edge.prerequisite_id);
    prereqGraph.set(edge.topic_id, list);
  }
  prereqGraph.set(topicId, uniqueIds);

  const visited = new Set<string>();
  const stack = [...uniqueIds];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === topicId) {
      throw new ValidationError('Circular dependency detected: this prerequisite creates a cycle');
    }
    if (visited.has(current)) continue;
    visited.add(current);

    const upstream = prereqGraph.get(current) || [];
    for (const nextId of upstream) {
      if (nextId === topicId) {
        throw new ValidationError('Circular dependency detected: this prerequisite creates a cycle');
      }
      if (!visited.has(nextId)) {
        stack.push(nextId);
      }
    }
  }

  return uniqueIds;
}

export async function computeTopicUnlockStatus(topicId: string): Promise<TopicUnlockStatus> {
  const db = getDb();
  const topicRow = await db.queryOne<{ id: string; is_completed: boolean | number }>(
    'SELECT id, is_completed FROM topics WHERE id = $1',
    [topicId]
  );

  if (!topicRow) {
    throw new NotFoundError('Topic not found');
  }

  const prereqRows = await db.query<{ id: string; title: string; is_completed: boolean | number }>(
    `SELECT t.id, t.title, t.is_completed
     FROM topic_prerequisites tp
     INNER JOIN topics t ON tp.prerequisite_id = t.id
     WHERE tp.topic_id = $1
     ORDER BY t.created_at ASC`,
    [topicId]
  );

  const prerequisites: PrerequisiteSummary[] = prereqRows.map((p) => ({
    id: p.id,
    title: p.title,
    isCompleted: toBool(p.is_completed),
  }));

  const missingPrerequisites = prerequisites
    .filter((p) => !p.isCompleted)
    .map((p) => ({ id: p.id, title: p.title }));

  const isCompleted = toBool(topicRow.is_completed);
  const isUnlocked = missingPrerequisites.length === 0;

  let status: TopicStatus;
  if (isCompleted) {
    status = 'completed';
  } else if (isUnlocked) {
    status = 'available';
  } else {
    status = 'locked';
  }

  return {
    topicId,
    status,
    isUnlocked,
    isCompleted,
    prerequisites,
    missingPrerequisites,
  };
}

export async function computeGoalTopicsWithStatus(goalId: string) {
  const db = getDb();
  const topicRows = await db.query<{
    id: string;
    goal_id: string;
    title: string;
    description: string;
    estimated_minutes: number;
    is_completed: boolean | number;
    completed_at: string | Date | null;
    created_at: string | Date;
  }>(
    `SELECT id, goal_id, title, description, estimated_minutes, is_completed, completed_at, created_at
     FROM topics
     WHERE goal_id = $1
     ORDER BY created_at ASC`,
    [goalId]
  );

  const topicMap = new Map(topicRows.map((t) => [t.id, t]));
  const edgeRows = await db.query<{ topic_id: string; prerequisite_id: string }>(
    `SELECT tp.topic_id, tp.prerequisite_id
     FROM topic_prerequisites tp
     INNER JOIN topics t ON tp.topic_id = t.id
     WHERE t.goal_id = $1`,
    [goalId]
  );

  const prereqsByTopic = new Map<string, PrerequisiteSummary[]>();
  for (const edge of edgeRows) {
    const prereqTopic = topicMap.get(edge.prerequisite_id);
    if (!prereqTopic) continue;
    const list = prereqsByTopic.get(edge.topic_id) || [];
    list.push({
      id: prereqTopic.id,
      title: prereqTopic.title,
      isCompleted: toBool(prereqTopic.is_completed),
    });
    prereqsByTopic.set(edge.topic_id, list);
  }

  return topicRows.map((row) => {
    const prerequisites = prereqsByTopic.get(row.id) || [];
    const missingPrerequisites = prerequisites
      .filter((p) => !p.isCompleted)
      .map((p) => ({ id: p.id, title: p.title }));

    const isCompleted = toBool(row.is_completed);
    const isUnlocked = missingPrerequisites.length === 0;
    const status: TopicStatus = isCompleted ? 'completed' : isUnlocked ? 'available' : 'locked';

    return {
      id: row.id,
      goalId: row.goal_id,
      title: row.title,
      description: row.description,
      estimatedMinutes: Number(row.estimated_minutes),
      isCompleted,
      completedAt: toIsoString(row.completed_at),
      createdAt: toIsoString(row.created_at) || '',
      status,
      isUnlocked,
      prerequisites,
      missingPrerequisites,
    };
  });
}
