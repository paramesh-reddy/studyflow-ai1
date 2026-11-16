import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { getDb, toIsoString } from '../db/database.ts';
import { getEnvConfig } from '../config.ts';
import { ForbiddenError, NotFoundError, ValidationError } from '../core/errors.ts';
import { getProgressOverview, getWeeklyAndSixWeekProgress } from './progressService.ts';
import { computeGoalTopicsWithStatus } from './prerequisiteService.ts';
import { listSessionsForUser } from './sessionService.ts';
import { generateEmbedding } from './documentService.ts';

export interface RagSource {
  type: 'goal' | 'topic' | 'session' | 'document';
  label: string;
  detail: string;
}

export interface RetrievedContext {
  overview: Awaited<ReturnType<typeof getProgressOverview>>;
  weekly: Awaited<ReturnType<typeof getWeeklyAndSixWeekProgress>>;
  topicsByGoal: Array<{
    goalId: string;
    goalTitle: string;
    goalDescription: string;
    targetDate: string | null;
    topics: Awaited<ReturnType<typeof computeGoalTopicsWithStatus>>;
  }>;
  relevantSessions: Array<{
    studyDate: string;
    goalTitle: string;
    topicTitle: string;
    minutes: number;
    notes: string;
    score: number;
  }>;
  relevantDocChunks: Array<{
    documentTitle: string;
    chunkText: string;
    score: number;
  }>;
  sources: RagSource[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function keywordScore(queryTokens: string[], text: string): number {
  if (queryTokens.length === 0) return 0;
  const hay = text.toLowerCase();
  let hits = 0;
  for (const token of queryTokens) {
    if (hay.includes(token)) hits += 1;
  }
  return hits / queryTokens.length;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Strictly scoped RAG retrieval: NEVER queries or leaks data outside `userId`.
 */
export async function retrieveUserRagContext(
  userId: string,
  query: string
): Promise<RetrievedContext> {
  const [overview, weekly, sessionData] = await Promise.all([
    getProgressOverview(userId),
    getWeeklyAndSixWeekProgress(userId),
    listSessionsForUser(userId),
  ]);
  const { sessions } = sessionData;
  const queryTokens = tokenize(query);

  const topicsByGoal = await Promise.all(
    overview.goals.map(async (g) => ({
      goalId: g.id,
      goalTitle: g.title,
      goalDescription: g.description,
      targetDate: g.targetDate,
      topics: await computeGoalTopicsWithStatus(g.id),
    }))
  );

  const scoredSessions = sessions
    .map((s) => ({
      studyDate: s.studyDate,
      goalTitle: s.goalTitle,
      topicTitle: s.topicTitle,
      minutes: s.minutes,
      notes: s.notes,
      score: keywordScore(queryTokens, `${s.goalTitle} ${s.topicTitle} ${s.notes}`),
    }))
    .sort((a, b) => b.score - a.score || (b.studyDate > a.studyDate ? 1 : -1));

  const relevantSessions = scoredSessions.slice(0, 8);

  const db = getDb();
  const chunkRows = await db.query<{
    doc_title: string;
    chunk_text: string;
    embedding_json: string | null;
  }>(
    `SELECT d.title AS doc_title, c.chunk_text, c.embedding_json
     FROM document_chunks c
     INNER JOIN learning_documents d ON c.document_id = d.id
     WHERE c.user_id = $1`,
    [userId]
  );

  let queryEmbedding: number[] | null = null;
  if (chunkRows.some((r) => r.embedding_json !== null)) {
    queryEmbedding = await generateEmbedding(query);
  }

  let pgVectorChunks: Array<{ documentTitle: string; chunkText: string; score: number }> = [];
  if (db.pgvectorEnabled && queryEmbedding) {
    try {
      const vecLiteral = `[${queryEmbedding.join(',')}]`;
      const vecRows = await db.query<{ doc_title: string; chunk_text: string; sim: number }>(
        `SELECT d.title AS doc_title, c.chunk_text, 1 - (c.embedding <=> $2::vector) AS sim
         FROM document_chunks c
         INNER JOIN learning_documents d ON c.document_id = d.id
         WHERE c.user_id = $1 AND c.embedding IS NOT NULL
         ORDER BY c.embedding <=> $2::vector
         LIMIT 4`,
        [userId, vecLiteral]
      );
      pgVectorChunks = vecRows.map((r) => ({
        documentTitle: r.doc_title,
        chunkText: r.chunk_text,
        score: Number(r.sim || 0) * 0.7 + keywordScore(queryTokens, `${r.doc_title} ${r.chunk_text}`) * 0.3,
      }));
    } catch {
      pgVectorChunks = [];
    }
  }

  const relevantDocChunks =
    pgVectorChunks.length > 0
      ? pgVectorChunks.filter((c) => c.score > 0.05)
      : chunkRows
          .map((row) => {
            const kw = keywordScore(queryTokens, `${row.doc_title} ${row.chunk_text}`);
            let sim = 0;
            if (queryEmbedding && row.embedding_json) {
              try {
                const parsed = JSON.parse(row.embedding_json) as number[];
                sim = cosineSimilarity(queryEmbedding, parsed);
              } catch {
                sim = 0;
              }
            }
            return {
              documentTitle: row.doc_title,
              chunkText: row.chunk_text,
              score: sim * 0.7 + kw * 0.3,
            };
          })
          .filter((c) => c.score > 0.05)
          .sort((a, b) => b.score - a.score)
          .slice(0, 4);

  const sources: RagSource[] = [];
  for (const g of overview.goals.slice(0, 4)) {
    sources.push({
      type: 'goal',
      label: g.title,
      detail: `${g.completedTopics}/${g.totalTopics} topics completed (${g.progressPercentage}%) · ${g.totalMinutesStudied}m studied`,
    });
  }

  for (const group of topicsByGoal) {
    const matchedTopics = group.topics.filter(
      (t) =>
        keywordScore(queryTokens, `${t.title} ${t.description}`) > 0 ||
        t.status === 'available' ||
        t.status === 'locked'
    );
    for (const t of matchedTopics.slice(0, 3)) {
      const missingText =
        t.missingPrerequisites.length > 0
          ? `Missing prerequisites: ${t.missingPrerequisites.map((m) => m.title).join(', ')}`
          : t.status === 'completed'
          ? 'Completed'
          : 'Ready to study';
      sources.push({
        type: 'topic',
        label: `${group.goalTitle} → ${t.title}`,
        detail: `Status: ${t.status} · ${missingText}`,
      });
    }
  }

  for (const s of relevantSessions.slice(0, 3)) {
    sources.push({
      type: 'session',
      label: `${s.studyDate} · ${s.topicTitle}`,
      detail: `${s.minutes} min${s.notes ? ` — "${s.notes.slice(0, 80)}"` : ''}`,
    });
  }

  for (const doc of relevantDocChunks) {
    sources.push({
      type: 'document',
      label: doc.documentTitle,
      detail: doc.chunkText.slice(0, 90),
    });
  }

  return {
    overview,
    weekly,
    topicsByGoal,
    relevantSessions,
    relevantDocChunks,
    sources: sources.slice(0, 8),
  };
}

function buildContextPrompt(ctx: RetrievedContext): string {
  const lines: string[] = [];
  lines.push('### LEARNER PROGRESS SUMMARY (EXACT SQL DATA)');
  lines.push(
    `Total Goals: ${ctx.overview.totalGoals} | Total Topics: ${ctx.overview.totalTopics} | Completed: ${ctx.overview.completedTopics} | Available (Unlocked): ${ctx.overview.availableTopics} | Locked: ${ctx.overview.lockedTopics}`
  );
  lines.push(
    `Overall Completion: ${ctx.overview.overallCompletionPercentage}% | All-time Study Time: ${ctx.overview.totalStudyHours} hours (${ctx.overview.totalMinutesStudied} mins)`
  );
  lines.push(
    `Study Time This Week (last 7 days): ${ctx.weekly.thisWeekHours} hours (${ctx.weekly.thisWeekMinutes} mins)`
  );
  lines.push(
    `Study Time Last 6 Weeks: ${ctx.weekly.sixWeekHours} hours (${ctx.weekly.sixWeekMinutes} mins)`
  );

  lines.push('\n### GOALS & PREREQUISITE STATUSES (LIVE DAG COMPUTATION)');
  if (ctx.topicsByGoal.length === 0) {
    lines.push('The learner has not created any study goals yet.');
  } else {
    for (const g of ctx.topicsByGoal) {
      const goalMeta = ctx.overview.goals.find((item) => item.id === g.goalId);
      lines.push(
        `Goal: "${g.goalTitle}" | Progress: ${goalMeta?.progressPercentage ?? 0}% | Studied: ${goalMeta?.totalMinutesStudied ?? 0} mins | Target Date: ${g.targetDate || 'None'}`
      );
      if (g.goalDescription) {
        lines.push(`  Description: ${g.goalDescription}`);
      }
      if (g.topics.length === 0) {
        lines.push('  Topics: None yet.');
      } else {
        for (const t of g.topics) {
          const prereqNames =
            t.prerequisites.length > 0
              ? t.prerequisites
                  .map((p) => `${p.title} (${p.isCompleted ? 'done' : 'incomplete'})`)
                  .join(', ')
              : 'None';
          const missing =
            t.missingPrerequisites.length > 0
              ? ` | Missing prerequisites: ${t.missingPrerequisites.map((m) => m.title).join(', ')}`
              : '';
          lines.push(
            `  - Topic: "${t.title}" | Status: ${t.status.toUpperCase()} | Est: ${t.estimatedMinutes}m | Prerequisites: [${prereqNames}]${missing}`
          );
        }
      }
    }
  }

  lines.push('\n### RELEVANT STUDY SESSIONS & NOTES');
  if (ctx.relevantSessions.length === 0) {
    lines.push('No study sessions logged yet.');
  } else {
    for (const s of ctx.relevantSessions) {
      lines.push(
        `- ${s.studyDate} | ${s.goalTitle} -> ${s.topicTitle} | ${s.minutes} mins | Notes: ${s.notes || '(no notes)'}`
      );
    }
  }

  if (ctx.relevantDocChunks.length > 0) {
    lines.push('\n### RELEVANT UPLOADED LEARNING DOCUMENTS');
    for (const d of ctx.relevantDocChunks) {
      lines.push(`- [${d.documentTitle}]: ${d.chunkText}`);
    }
  }

  return lines.join('\n');
}

function buildDeterministicGroundedFallback(query: string, ctx: RetrievedContext): string {
  const q = query.toLowerCase();
  const availableTopics = ctx.topicsByGoal.flatMap((g) =>
    g.topics.filter((t) => t.status === 'available').map((t) => ({ goal: g.goalTitle, topic: t }))
  );
  const lockedTopics = ctx.topicsByGoal.flatMap((g) =>
    g.topics.filter((t) => t.status === 'locked').map((t) => ({ goal: g.goalTitle, topic: t }))
  );

  if (ctx.overview.totalGoals === 0) {
    return "You don't have any study goals yet. Create your first goal and add topics so I can track prerequisites and recommend your next steps.";
  }

  if (q.includes('locked') || q.includes('prerequisite') || q.includes('incomplete')) {
    if (lockedTopics.length === 0) {
      return `None of your topics are currently locked! You have ${availableTopics.length} unlocked topic(s) ready to study and ${ctx.overview.completedTopics} completed.`;
    }
    const details = lockedTopics
      .slice(0, 6)
      .map(
        (item) =>
          `- **${item.topic.title}** (${item.goal}): missing ${item.topic.missingPrerequisites
            .map((m) => `"${m.title}"`)
            .join(', ')}`
      )
      .join('\n');
    return `Here are your currently locked topics and the exact incomplete prerequisites blocking them:\n\n${details}`;
  }

  if (q.includes('week') || q.includes('time') || q.includes('hours') || q.includes('minutes')) {
    return `Over the last 7 days, you studied **${ctx.weekly.thisWeekHours} hours (${ctx.weekly.thisWeekMinutes} minutes)**. Across the last 6 weeks, you have logged **${ctx.weekly.sixWeekHours} hours**, and your all-time total is **${ctx.overview.totalStudyHours} hours** across ${ctx.overview.totalGoals} goal(s).`;
  }

  if (q.includes('next') || q.includes('plan')) {
    if (availableTopics.length === 0) {
      return `You have completed ${ctx.overview.completedTopics} of ${ctx.overview.totalTopics} topics (${ctx.overview.overallCompletionPercentage}%). All unlocked topics are finished.`;
    }
    const nextList = availableTopics
      .slice(0, 4)
      .map(
        (item) =>
          `- **${item.topic.title}** (${item.goal}) — est. ${item.topic.estimatedMinutes} min`
      )
      .join('\n');
    return `Based on your current prerequisite states, these unlocked topics are ready to study next:\n\n${nextList}`;
  }

  return `Progress summary across your ${ctx.overview.totalGoals} goal(s): **${ctx.overview.completedTopics}/${ctx.overview.totalTopics} topics completed (${ctx.overview.overallCompletionPercentage}%)**, **${ctx.overview.availableTopics} available**, and **${ctx.overview.lockedTopics} locked**. You studied **${ctx.weekly.thisWeekHours} hours** this week and **${ctx.overview.totalStudyHours} hours** overall.${
    availableTopics.length > 0
      ? `\n\nRecommended next unlocked topic: **${availableTopics[0].topic.title}** in **${availableTopics[0].goal}**.`
      : ''
  }`;
}

export async function listConversationsForUser(userId: string) {
  const db = getDb();
  const rows = await db.query<{
    id: string;
    title: string;
    created_at: string | Date;
    updated_at: string | Date;
    message_count: string | number;
  }>(
    `SELECT c.id, c.title, c.created_at, c.updated_at,
            (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) AS message_count
     FROM chat_conversations c
     WHERE c.user_id = $1
     ORDER BY c.updated_at DESC`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    messageCount: Number(r.message_count),
    createdAt: toIsoString(r.created_at) || '',
    updatedAt: toIsoString(r.updated_at) || '',
  }));
}

export async function getConversationMessages(conversationId: string, userId: string) {
  const db = getDb();
  const conv = await db.queryOne<{
    id: string;
    user_id: string;
    title: string;
    created_at: string | Date;
    updated_at: string | Date;
  }>('SELECT id, user_id, title, created_at, updated_at FROM chat_conversations WHERE id = $1', [
    conversationId,
  ]);

  if (!conv) {
    throw new NotFoundError('Conversation not found');
  }
  if (conv.user_id !== userId) {
    throw new ForbiddenError('You do not have access to this conversation');
  }

  const messages = await db.query<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources_json: string;
    created_at: string | Date;
  }>(
    'SELECT id, role, content, sources_json, created_at FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  );

  return {
    id: conv.id,
    title: conv.title,
    createdAt: toIsoString(conv.created_at) || '',
    updatedAt: toIsoString(conv.updated_at) || '',
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sources: JSON.parse(m.sources_json || '[]') as RagSource[],
      createdAt: toIsoString(m.created_at) || '',
    })),
  };
}

export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
  const db = getDb();
  const conv = await db.queryOne<{ id: string; user_id: string }>(
    'SELECT id, user_id FROM chat_conversations WHERE id = $1',
    [conversationId]
  );

  if (!conv) {
    throw new NotFoundError('Conversation not found');
  }
  if (conv.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this conversation');
  }

  await db.execute('DELETE FROM chat_conversations WHERE id = $1 AND user_id = $2', [
    conversationId,
    userId,
  ]);
}

export async function chatWithAssistant(
  userId: string,
  userName: string,
  input: { message: string; conversationId?: string | null }
) {
  const message = (input.message || '').trim();
  if (!message || message.length > 2000) {
    throw new ValidationError('Message must be between 1 and 2000 characters');
  }

  const db = getDb();
  let conversationId = input.conversationId || null;

  if (conversationId) {
    const conv = await db.queryOne<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM chat_conversations WHERE id = $1',
      [conversationId]
    );
    if (!conv) {
      throw new NotFoundError('Conversation not found');
    }
    if (conv.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this conversation');
    }
  } else {
    conversationId = uuidv4();
    const title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO chat_conversations (id, user_id, title, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [conversationId, userId, title, now, now]
    );
  }

  const historyRows = await db.query<{ role: 'user' | 'assistant'; content: string }>(
    'SELECT role, content FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 8',
    [conversationId]
  );
  const history = historyRows.reverse();

  const userMsgId = uuidv4();
  const userMsgTime = new Date().toISOString();
  await db.execute(
    'INSERT INTO chat_messages (id, conversation_id, role, content, sources_json, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [userMsgId, conversationId, 'user', message, '[]', userMsgTime]
  );

  const retrieved = await retrieveUserRagContext(userId, message);
  const contextBlock = buildContextPrompt(retrieved);

  let answerText = '';
  const cfg = getEnvConfig();

  if (cfg.geminiApiKey && cfg.geminiApiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey: cfg.geminiApiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const historyText =
        history.length > 0
          ? `\n### CONVERSATION HISTORY\n${history
              .map((h) => `${h.role === 'user' ? 'Learner' : 'Assistant'}: ${h.content}`)
              .join('\n')}\n`
          : '';

      const prompt = `${contextBlock}${historyText}\n### LEARNER QUESTION\n${message}`;

      const response = await ai.models.generateContent({
        model: cfg.geminiChatModel,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `You are StudyFlow AI, an academic study coach and progress analyst for ${userName}.
Strict Rules:
1. Answer ONLY using the verified SQL, prerequisite DAG, study session, and learning document context provided below.
2. Never invent study hours, session counts, or completion percentages.
3. Never claim a topic is unlocked/available if its Status is LOCKED; always cite the exact missing prerequisite titles.
4. If the learner lacks data for a question, clearly say so and suggest what they can add.
5. Reference exact goal names, topic titles, and study session dates when helpful.
6. Keep responses structured, concise, actionable, and encouraging.`,
        },
      });

      answerText = (response.text || '').trim();
    } catch (err) {
      console.error('Gemini API fallback triggered:', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (!answerText) {
    answerText = buildDeterministicGroundedFallback(message, retrieved);
  }

  const assistantMsgId = uuidv4();
  const assistantMsgTime = new Date().toISOString();
  await db.execute(
    'INSERT INTO chat_messages (id, conversation_id, role, content, sources_json, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [
      assistantMsgId,
      conversationId,
      'assistant',
      answerText,
      JSON.stringify(retrieved.sources),
      assistantMsgTime,
    ]
  );

  await db.execute('UPDATE chat_conversations SET updated_at = $1 WHERE id = $2', [
    assistantMsgTime,
    conversationId,
  ]);

  return {
    conversationId,
    userMessage: {
      id: userMsgId,
      role: 'user' as const,
      content: message,
      sources: [] as RagSource[],
      createdAt: userMsgTime,
    },
    assistantMessage: {
      id: assistantMsgId,
      role: 'assistant' as const,
      content: answerText,
      sources: retrieved.sources,
      createdAt: assistantMsgTime,
    },
  };
}
