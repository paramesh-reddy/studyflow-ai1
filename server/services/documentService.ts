import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import { getDb, toIsoString } from '../db/database.ts';
import { getEnvConfig } from '../config.ts';
import { ForbiddenError, NotFoundError, ValidationError } from '../core/errors.ts';

export interface LearningDocumentRecord {
  id: string;
  userId: string;
  goalId: string | null;
  goalTitle: string | null;
  title: string;
  content: string;
  chunkCount: number;
  createdAt: string;
}

function splitIntoChunks(text: string, maxLen: number = 500): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= maxLen) {
      chunks.push(para);
    } else {
      for (let i = 0; i < para.length; i += maxLen) {
        chunks.push(para.slice(i, i + maxLen));
      }
    }
  }
  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const cfg = getEnvConfig();
  if (!cfg.geminiApiKey || cfg.geminiApiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  try {
    const ai = new GoogleGenAI({
      apiKey: cfg.geminiApiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const res = await ai.models.embedContent({
      model: cfg.geminiEmbeddingModel,
      contents: text,
    });
    const values = res.embeddings?.[0]?.values;
    return Array.isArray(values) ? values : null;
  } catch {
    return null;
  }
}

export async function listDocumentsForUser(userId: string): Promise<LearningDocumentRecord[]> {
  const db = getDb();
  const rows = await db.query<{
    id: string;
    user_id: string;
    goal_id: string | null;
    goal_title: string | null;
    title: string;
    content: string;
    chunk_count: string | number;
    created_at: string | Date;
  }>(
    `SELECT d.id, d.user_id, d.goal_id, g.title AS goal_title, d.title, d.content, d.created_at,
            (SELECT COUNT(*) FROM document_chunks c WHERE c.document_id = d.id) AS chunk_count
     FROM learning_documents d
     LEFT JOIN goals g ON d.goal_id = g.id
     WHERE d.user_id = $1
     ORDER BY d.created_at DESC`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    goalId: r.goal_id,
    goalTitle: r.goal_title,
    title: r.title,
    content: r.content,
    chunkCount: Number(r.chunk_count),
    createdAt: toIsoString(r.created_at) || '',
  }));
}

export async function createLearningDocument(
  userId: string,
  input: { title: string; content: string; goalId?: string | null }
): Promise<LearningDocumentRecord> {
  const title = (input.title || '').trim();
  const content = (input.content || '').trim();
  const goalId = input.goalId ? input.goalId.trim() : null;

  if (title.length < 2 || title.length > 160) {
    throw new ValidationError('Document title must be between 2 and 160 characters');
  }
  if (content.length < 10 || content.length > 50000) {
    throw new ValidationError('Document content must be between 10 and 50000 characters');
  }

  const db = getDb();
  if (goalId) {
    const goal = await db.queryOne<{ id: string; owner_id: string }>(
      'SELECT id, owner_id FROM goals WHERE id = $1',
      [goalId]
    );
    if (!goal || goal.owner_id !== userId) {
      throw new ForbiddenError('Selected goal does not belong to you');
    }
  }

  const docId = uuidv4();
  const createdAt = new Date().toISOString();
  const chunks = splitIntoChunks(content);
  const embeddings = await Promise.all(chunks.map((c) => generateEmbedding(c)));

  await db.transaction(async (tx) => {
    await tx.execute(
      'INSERT INTO learning_documents (id, user_id, goal_id, title, content, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [docId, userId, goalId, title, content, createdAt]
    );

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkText = chunks[idx];
      const emb = embeddings[idx];
      if (tx.pgvectorEnabled && emb) {
        const vecLiteral = `[${emb.join(',')}]`;
        await tx.execute(
          'INSERT INTO document_chunks (id, document_id, user_id, chunk_text, embedding_json, embedding, created_at) VALUES ($1, $2, $3, $4, $5, $6::vector, $7)',
          [uuidv4(), docId, userId, chunkText, JSON.stringify(emb), vecLiteral, createdAt]
        );
      } else {
        await tx.execute(
          'INSERT INTO document_chunks (id, document_id, user_id, chunk_text, embedding_json, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [uuidv4(), docId, userId, chunkText, emb ? JSON.stringify(emb) : null, createdAt]
        );
      }
    }
  });

  const docs = await listDocumentsForUser(userId);
  return docs.find((d) => d.id === docId)!;
}

export async function deleteLearningDocument(docId: string, userId: string): Promise<void> {
  const db = getDb();
  const row = await db.queryOne<{ id: string; user_id: string }>(
    'SELECT id, user_id FROM learning_documents WHERE id = $1',
    [docId]
  );

  if (!row) {
    throw new NotFoundError('Learning document not found');
  }
  if (row.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to delete this document');
  }

  await db.execute('DELETE FROM learning_documents WHERE id = $1 AND user_id = $2', [
    docId,
    userId,
  ]);
}
