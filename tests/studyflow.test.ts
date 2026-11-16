import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createIsolatedDatabase, closeDb } from '../server/db/database.ts';
import { seedDatabaseIfEmpty } from '../server/db/seed.ts';
import { createApiApp } from '../server/app.ts';
import { retrieveUserRagContext } from '../server/services/aiService.ts';

process.env.NODE_ENV = 'test';

let server: http.Server;
let baseUrl = '';

async function request(
  method: string,
  path: string,
  options?: { token?: string; body?: unknown }
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {};
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data };
}

describe('StudyFlow AI Automated Test Suite (20 Tests)', () => {
  let alexToken = '';
  let priyaToken = '';
  let mentorToken = '';

  before(async () => {
    createIsolatedDatabase(':memory:');
    await seedDatabaseIfEmpty();
    const app = createApiApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
        resolve();
      });
    });

    alexToken = (
      await request('POST', '/auth/login', {
        body: { email: 'alex@studyflow.ai', password: 'LearnerPass123!' },
      })
    ).data.accessToken;

    priyaToken = (
      await request('POST', '/auth/login', {
        body: { email: 'priya@studyflow.ai', password: 'LearnerPass123!' },
      })
    ).data.accessToken;

    mentorToken = (
      await request('POST', '/auth/login', {
        body: { email: 'mentor@studyflow.ai', password: 'MentorPass123!' },
      })
    ).data.accessToken;
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      if (server) server.close(() => resolve());
      else resolve();
    });
    await closeDb();
  });

  it('1. Registers a new learner and ignores client-supplied mentor role', async () => {
    const res = await request('POST', '/auth/register', {
      body: {
        email: 'newlearner@studyflow.ai',
        name: 'Jordan Taylor',
        password: 'StrongPassword123!',
        role: 'mentor',
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.user.role, 'learner');
    assert.ok(res.data.accessToken);
  });

  it('2. Authenticates user login and rejects invalid password', async () => {
    const ok = await request('POST', '/auth/login', {
      body: { email: 'alex@studyflow.ai', password: 'LearnerPass123!' },
    });
    assert.equal(ok.status, 200);
    assert.ok(ok.data.refreshToken);

    const bad = await request('POST', '/auth/login', {
      body: { email: 'alex@studyflow.ai', password: 'WrongPassword!' },
    });
    assert.equal(bad.status, 401);
  });

  it('3. Blocks learner from accessing or deleting another learner goal', async () => {
    const priyaGoals = await request('GET', '/goals', { token: priyaToken });
    const priyaGoalId = priyaGoals.data.goals[0].id;

    const getRes = await request('GET', `/goals/${priyaGoalId}`, { token: alexToken });
    assert.equal(getRes.status, 403);

    const delRes = await request('DELETE', `/goals/${priyaGoalId}`, { token: alexToken });
    assert.equal(delRes.status, 403);
  });

  it('4. Allows mentor to list learners and view any learner goals', async () => {
    const learners = await request('GET', '/mentor/learners?search=alex', { token: mentorToken });
    assert.equal(learners.status, 200);
    assert.equal(learners.data.learners.length, 1);

    const alexId = learners.data.learners[0].id;
    const goals = await request('GET', `/mentor/learners/${alexId}/goals`, { token: mentorToken });
    assert.equal(goals.status, 200);
    assert.equal(goals.data.goals.length, 3);
  });

  it('5. Blocks learner from viewing or modifying admin configuration', async () => {
    const getCfg = await request('GET', '/admin/config', { token: alexToken });
    assert.equal(getCfg.status, 403);

    const putCfg = await request('PUT', '/admin/config', {
      token: alexToken,
      body: { minSessionMinutes: 1 },
    });
    assert.equal(putCfg.status, 403);
  });

  it('6. Rejects self-prerequisites on topics', async () => {
    const g = (await request('POST', '/goals', { token: alexToken, body: { title: 'Self Prereq Goal' } })).data.goal;
    const t = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'Self Topic' } })).data.topic;

    const res = await request('PUT', `/topics/${t.id}`, {
      token: alexToken,
      body: { prerequisiteIds: [t.id] },
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error.message, /itself/i);
  });

  it('7. Rejects direct and transitive circular dependencies', async () => {
    const g = (await request('POST', '/goals', { token: alexToken, body: { title: 'Cycle Goal' } })).data.goal;
    const t1 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'T1' } })).data.topic;
    const t2 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'T2', prerequisiteIds: [t1.id] } })).data.topic;
    const t3 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'T3', prerequisiteIds: [t2.id] } })).data.topic;

    const cycleRes = await request('PUT', `/topics/${t1.id}`, {
      token: alexToken,
      body: { prerequisiteIds: [t3.id] },
    });
    assert.equal(cycleRes.status, 400);
    assert.match(cycleRes.data.error.message, /circular/i);
  });

  it('8. Rejects prerequisites exceeding configured maximum', async () => {
    const g = (await request('POST', '/goals', { token: alexToken, body: { title: 'Max Prereq Goal' } })).data.goal;
    const ids: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const t = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: `Node ${i}` } })).data.topic;
      ids.push(t.id);
    }

    const res = await request('POST', `/goals/${g.id}/topics`, {
      token: alexToken,
      body: { title: 'Target Node', prerequisiteIds: ids },
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error.message, /more than 5/i);
  });

  it('9. Keeps topic locked while any prerequisite is incomplete', async () => {
    const g = (await request('POST', '/goals', { token: alexToken, body: { title: 'Lock Goal' } })).data.goal;
    const t1 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'Prereq 1' } })).data.topic;
    const t2 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'Dependent', prerequisiteIds: [t1.id] } })).data.topic;

    const status = await request('GET', `/topics/${t2.id}/unlock-status`, { token: alexToken });
    assert.equal(status.status, 200);
    assert.equal(status.data.status, 'locked');
    assert.equal(status.data.missingPrerequisites[0].id, t1.id);
  });

  it('10. Unlocks topic automatically when all prerequisites are completed', async () => {
    const g = (await request('POST', '/goals', { token: alexToken, body: { title: 'Unlock Goal' } })).data.goal;
    const t1 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'Step 1' } })).data.topic;
    const t2 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'Step 2', prerequisiteIds: [t1.id] } })).data.topic;

    const res = await request('POST', `/topics/${t1.id}/complete`, { token: alexToken });
    assert.equal(res.status, 200);
    const updatedT2 = res.data.topics.find((t: any) => t.id === t2.id);
    assert.equal(updatedT2.status, 'available');
  });

  it('11. Reopening a completed prerequisite relocks incomplete dependents dynamically', async () => {
    const g = (await request('POST', '/goals', { token: alexToken, body: { title: 'Reopen Goal' } })).data.goal;
    const t1 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'Base' } })).data.topic;
    const t2 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'Child', prerequisiteIds: [t1.id] } })).data.topic;

    await request('POST', `/topics/${t1.id}/complete`, { token: alexToken });
    const reopened = await request('POST', `/topics/${t1.id}/reopen`, { token: alexToken });
    assert.equal(reopened.status, 200);
    const child = reopened.data.topics.find((t: any) => t.id === t2.id);
    assert.equal(child.status, 'locked');
  });

  it('12. Rejects completion of locked topics and returns exact missing prerequisites', async () => {
    const g = (await request('POST', '/goals', { token: alexToken, body: { title: 'Block Complete Goal' } })).data.goal;
    const t1 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'Missing Alpha' } })).data.topic;
    const t2 = (await request('POST', `/goals/${g.id}/topics`, { token: alexToken, body: { title: 'Blocked Beta', prerequisiteIds: [t1.id] } })).data.topic;

    const res = await request('POST', `/topics/${t2.id}/complete`, { token: alexToken });
    assert.equal(res.status, 400);
    assert.equal(res.data.error.details.missingPrerequisites[0].title, 'Missing Alpha');
  });

  it('13. Rejects study sessions below configured minimum minutes', async () => {
    const goals = (await request('GET', '/goals', { token: alexToken })).data.goals;
    const goalId = goals[0].id;
    const topicId = (await request('GET', `/goals/${goalId}/topics`, { token: alexToken })).data.topics[0].id;
    const today = new Date().toISOString().slice(0, 10);

    const res = await request('POST', '/sessions', {
      token: alexToken,
      body: { goalId, topicId, studyDate: today, minutes: 2 },
    });
    assert.equal(res.status, 400);
  });

  it('14. Rejects study sessions above configured maximum minutes', async () => {
    const goals = (await request('GET', '/goals', { token: alexToken })).data.goals;
    const goalId = goals[0].id;
    const topicId = (await request('GET', `/goals/${goalId}/topics`, { token: alexToken })).data.topics[0].id;
    const today = new Date().toISOString().slice(0, 10);

    const res = await request('POST', '/sessions', {
      token: alexToken,
      body: { goalId, topicId, studyDate: today, minutes: 600 },
    });
    assert.equal(res.status, 400);
  });

  it('15. Rejects study sessions with future dates', async () => {
    const goals = (await request('GET', '/goals', { token: alexToken })).data.goals;
    const goalId = goals[0].id;
    const topicId = (await request('GET', `/goals/${goalId}/topics`, { token: alexToken })).data.topics[0].id;
    const future = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

    const res = await request('POST', '/sessions', {
      token: alexToken,
      body: { goalId, topicId, studyDate: future, minutes: 30 },
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error.message, /future/i);
  });

  it('16. Applies dynamic admin configuration updates immediately to session validation', async () => {
    const goals = (await request('GET', '/goals', { token: alexToken })).data.goals;
    const goalId = goals[0].id;
    const topicId = (await request('GET', `/goals/${goalId}/topics`, { token: alexToken })).data.topics[0].id;
    const today = new Date().toISOString().slice(0, 10);

    const cfgRes = await request('PUT', '/admin/config', {
      token: mentorToken,
      body: { minSessionMinutes: 20, maxSessionMinutes: 120 },
    });
    assert.equal(cfgRes.status, 200);

    const rejected = await request('POST', '/sessions', {
      token: alexToken,
      body: { goalId, topicId, studyDate: today, minutes: 12 },
    });
    assert.equal(rejected.status, 400);
    assert.match(rejected.data.error.message, /20 minutes/);

    const accepted = await request('POST', '/sessions', {
      token: alexToken,
      body: { goalId, topicId, studyDate: today, minutes: 45 },
    });
    assert.equal(accepted.status, 201);

    await request('PUT', '/admin/config', {
      token: mentorToken,
      body: { minSessionMinutes: 5, maxSessionMinutes: 480 },
    });
  });

  it('17. Calculates completion percentage accurately from topic completion states', async () => {
    const reg = await request('POST', '/auth/register', {
      body: {
        email: 'calc@studyflow.ai',
        name: 'Calc Tester',
        password: 'StrongPassword123!',
      },
    });
    const token = reg.data.accessToken;
    const g = (await request('POST', '/goals', { token, body: { title: 'Stats Goal' } })).data.goal;
    const t1 = (await request('POST', `/goals/${g.id}/topics`, { token, body: { title: 'One' } })).data.topic;
    await request('POST', `/goals/${g.id}/topics`, { token, body: { title: 'Two' } });
    await request('POST', `/goals/${g.id}/topics`, { token, body: { title: 'Three' } });
    await request('POST', `/goals/${g.id}/topics`, { token, body: { title: 'Four' } });

    await request('POST', `/topics/${t1.id}/complete`, { token });
    const overview = await request('GET', '/progress/overview', { token });
    assert.equal(overview.status, 200);
    assert.equal(overview.data.overallCompletionPercentage, 25);
  });

  it('18. Isolates AI RAG retrieval strictly to the authenticated learner', async () => {
    const g = (
      await request('POST', '/goals', {
        token: priyaToken,
        body: { title: 'Private Zero Knowledge Proofs' },
      })
    ).data.goal;
    const t = (
      await request('POST', `/goals/${g.id}/topics`, {
        token: priyaToken,
        body: { title: 'zk-SNARK Circuits' },
      })
    ).data.topic;
    await request('POST', '/sessions', {
      token: priyaToken,
      body: {
        goalId: g.id,
        topicId: t.id,
        studyDate: new Date().toISOString().slice(0, 10),
        minutes: 30,
        notes: 'SECRET_PRIYA_MARKER_4421',
      },
    });

    const alexMe = (await request('GET', '/auth/me', { token: alexToken })).data.user;
    const ctx = await retrieveUserRagContext(alexMe.id, 'Zero Knowledge SECRET_PRIYA_MARKER_4421');
    const dump = JSON.stringify(ctx);
    assert.equal(dump.includes('Private Zero Knowledge Proofs'), false);
    assert.equal(dump.includes('SECRET_PRIYA_MARKER_4421'), false);
  });

  it('19. Prevents learners from logging study sessions for another learner topics', async () => {
    const priyaGoals = (await request('GET', '/goals', { token: priyaToken })).data.goals;
    const priyaGoalId = priyaGoals[0].id;
    const priyaTopics = (await request('GET', `/goals/${priyaGoalId}/topics`, { token: priyaToken })).data.topics;
    const priyaTopicId = priyaTopics[0].id;

    const res = await request('POST', '/sessions', {
      token: alexToken,
      body: {
        goalId: priyaGoalId,
        topicId: priyaTopicId,
        studyDate: new Date().toISOString().slice(0, 10),
        minutes: 30,
      },
    });
    assert.equal(res.status, 403);
  });

  it('20. Supports indexing and deleting learner RAG documents with ownership checks', async () => {
    const docRes = await request('POST', '/assistant/documents', {
      token: alexToken,
      body: {
        title: 'Graph Algorithms Summary',
        content: 'Topological sorting detects cycles in directed acyclic graphs in O(V+E) time.',
      },
    });
    assert.equal(docRes.status, 201);
    const docId = docRes.data.document.id;

    const priyaDel = await request('DELETE', `/assistant/documents/${docId}`, {
      token: priyaToken,
    });
    assert.equal(priyaDel.status, 403);

    const alexDel = await request('DELETE', `/assistant/documents/${docId}`, {
      token: alexToken,
    });
    assert.equal(alexDel.status, 204);
  });
});
