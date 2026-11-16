import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireMentor } from '../../core/middleware.ts';
import type { AuthRequest } from '../../core/middleware.ts';
import { loginUser, refreshUserSession, registerLearner } from '../../services/authService.ts';
import { getAppConfiguration, updateAppConfiguration } from '../../services/configService.ts';
import {
  createGoal,
  deleteGoal,
  getGoalForUser,
  listGoalsForUser,
  updateGoal,
} from '../../services/goalService.ts';
import {
  completeTopic,
  createTopic,
  deleteTopic,
  getTopicUnlockStatusForUser,
  listTopicsForGoal,
  reopenTopic,
  updateTopic,
} from '../../services/topicService.ts';
import {
  createStudySession,
  deleteStudySession,
  listSessionsForUser,
  updateStudySession,
} from '../../services/sessionService.ts';
import {
  getGoalProgress,
  getProgressOverview,
  getWeeklyAndSixWeekProgress,
} from '../../services/progressService.ts';
import {
  getLearnerDetailForMentor,
  getLearnerGoalsForMentor,
  listLearnersForMentor,
} from '../../services/mentorService.ts';
import {
  chatWithAssistant,
  deleteConversation,
  getConversationMessages,
  listConversationsForUser,
} from '../../services/aiService.ts';
import {
  createLearningDocument,
  deleteLearningDocument,
  listDocumentsForUser,
} from '../../services/documentService.ts';

export function createV1Router(): express.Router {
  const router = express.Router();

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many AI assistant requests. Please wait a moment before sending another prompt.',
      },
    },
    skip: () => process.env.NODE_ENV === 'test',
  });

  // Health check
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'studyflow-ai' });
  });

  // ---------------- Authentication ----------------
  router.post('/auth/register', authLimiter, async (req, res, next) => {
    try {
      const result = await registerLearner(req.body || {});
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/login', authLimiter, async (req, res, next) => {
    try {
      const result = await loginUser(req.body || {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/refresh', authLimiter, async (req, res, next) => {
    try {
      const result = await refreshUserSession((req.body || {}).refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/auth/me', requireAuth, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // Read-only rule limits for authenticated learners (session form, topic prereq picker)
  router.get('/config/rules', requireAuth, async (_req, res, next) => {
    try {
      res.json(await getAppConfiguration());
    } catch (err) {
      next(err);
    }
  });

  // ---------------- Goals ----------------
  router.get('/goals', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const goals = await listGoalsForUser(req.user!.id);
      res.json({ goals });
    } catch (err) {
      next(err);
    }
  });

  router.post('/goals', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const goal = await createGoal(req.user!.id, req.body || {});
      res.status(201).json({ goal });
    } catch (err) {
      next(err);
    }
  });

  router.get('/goals/:goal_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const goal = await getGoalForUser(String(req.params.goal_id), req.user!.id);
      res.json({ goal });
    } catch (err) {
      next(err);
    }
  });

  router.put('/goals/:goal_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const goal = await updateGoal(String(req.params.goal_id), req.user!.id, req.body || {});
      res.json({ goal });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/goals/:goal_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      await deleteGoal(String(req.params.goal_id), req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ---------------- Topics & Prerequisite Engine ----------------
  router.get('/goals/:goal_id/topics', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const topics = await listTopicsForGoal(String(req.params.goal_id), req.user!.id);
      res.json({ topics });
    } catch (err) {
      next(err);
    }
  });

  router.post('/goals/:goal_id/topics', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const topic = await createTopic(String(req.params.goal_id), req.user!.id, req.body || {});
      res.status(201).json({ topic });
    } catch (err) {
      next(err);
    }
  });

  router.put('/topics/:topic_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const topic = await updateTopic(String(req.params.topic_id), req.user!.id, req.body || {});
      res.json({ topic });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/topics/:topic_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      await deleteTopic(String(req.params.topic_id), req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  router.post('/topics/:topic_id/complete', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const topics = await completeTopic(String(req.params.topic_id), req.user!.id);
      res.json({ topics });
    } catch (err) {
      next(err);
    }
  });

  router.post('/topics/:topic_id/reopen', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const topics = await reopenTopic(String(req.params.topic_id), req.user!.id);
      res.json({ topics });
    } catch (err) {
      next(err);
    }
  });

  router.get('/topics/:topic_id/unlock-status', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const status = await getTopicUnlockStatusForUser(String(req.params.topic_id), req.user!.id);
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  // ---------------- Study Sessions ----------------
  router.get('/sessions', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const data = await listSessionsForUser(req.user!.id, {
        goalId: typeof req.query.goalId === 'string' ? req.query.goalId : undefined,
        topicId: typeof req.query.topicId === 'string' ? req.query.topicId : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  router.post('/sessions', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const session = await createStudySession(req.user!.id, req.body || {});
      res.status(201).json({ session });
    } catch (err) {
      next(err);
    }
  });

  router.put('/sessions/:session_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const session = await updateStudySession(
        String(req.params.session_id),
        req.user!.id,
        req.body || {}
      );
      res.json({ session });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/sessions/:session_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      await deleteStudySession(String(req.params.session_id), req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // ---------------- Progress Analytics ----------------
  router.get('/progress/overview', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      res.json(await getProgressOverview(req.user!.id));
    } catch (err) {
      next(err);
    }
  });

  router.get('/progress/goals/:goal_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      res.json(await getGoalProgress(String(req.params.goal_id), req.user!.id));
    } catch (err) {
      next(err);
    }
  });

  router.get('/progress/weekly', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      res.json(await getWeeklyAndSixWeekProgress(req.user!.id));
    } catch (err) {
      next(err);
    }
  });

  // ---------------- Mentor / Admin Routes ----------------
  router.get('/mentor/learners', requireAuth, requireMentor, async (req, res, next) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      res.json({ learners: await listLearnersForMentor(search) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/mentor/learners/:learner_id', requireAuth, requireMentor, async (req, res, next) => {
    try {
      res.json(await getLearnerDetailForMentor(String(req.params.learner_id)));
    } catch (err) {
      next(err);
    }
  });

  router.get('/mentor/learners/:learner_id/goals', requireAuth, requireMentor, async (req, res, next) => {
    try {
      res.json({ goals: await getLearnerGoalsForMentor(String(req.params.learner_id)) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/config', requireAuth, requireMentor, async (_req, res, next) => {
    try {
      res.json(await getAppConfiguration());
    } catch (err) {
      next(err);
    }
  });

  router.put('/admin/config', requireAuth, requireMentor, async (req: AuthRequest, res, next) => {
    try {
      const updated = await updateAppConfiguration(req.user!.id, req.body || {});
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // ---------------- AI Learning Assistant (RAG) ----------------
  router.post('/assistant/chat', requireAuth, aiLimiter, async (req: AuthRequest, res, next) => {
    try {
      const result = await chatWithAssistant(req.user!.id, req.user!.name, req.body || {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/assistant/conversations', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      res.json({ conversations: await listConversationsForUser(req.user!.id) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/assistant/conversations/:conversation_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      res.json(await getConversationMessages(String(req.params.conversation_id), req.user!.id));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/assistant/conversations/:conversation_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      await deleteConversation(String(req.params.conversation_id), req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  router.get('/assistant/documents', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      res.json({ documents: await listDocumentsForUser(req.user!.id) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/assistant/documents', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const doc = await createLearningDocument(req.user!.id, req.body || {});
      res.status(201).json({ document: doc });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/assistant/documents/:doc_id', requireAuth, async (req: AuthRequest, res, next) => {
    try {
      await deleteLearningDocument(String(req.params.doc_id), req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
