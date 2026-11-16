import { getDb } from '../db/database.ts';
import { getGoalForUser, listGoalsForUser } from './goalService.ts';
import { computeGoalTopicsWithStatus } from './prerequisiteService.ts';
import { listSessionsForUser } from './sessionService.ts';

export async function getProgressOverview(userId: string) {
  const [goals, sessionData] = await Promise.all([
    listGoalsForUser(userId),
    listSessionsForUser(userId),
  ]);
  const { sessions, totalMinutes } = sessionData;

  const totalGoals = goals.length;
  const totalTopics = goals.reduce((acc, g) => acc + g.totalTopics, 0);
  const completedTopics = goals.reduce((acc, g) => acc + g.completedTopics, 0);
  const availableTopics = goals.reduce((acc, g) => acc + g.availableTopics, 0);
  const lockedTopics = goals.reduce((acc, g) => acc + g.lockedTopics, 0);
  const overallCompletionPercentage =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const totalStudyHours = Number((totalMinutes / 60).toFixed(1));

  const upcomingTargetDates = goals
    .filter((g) => g.targetDate && g.status !== 'completed')
    .sort((a, b) => (a.targetDate! > b.targetDate! ? 1 : -1))
    .slice(0, 5)
    .map((g) => ({
      goalId: g.id,
      title: g.title,
      category: g.category,
      targetDate: g.targetDate!,
      progressPercentage: g.progressPercentage,
    }));

  return {
    totalGoals,
    totalTopics,
    completedTopics,
    availableTopics,
    lockedTopics,
    totalMinutesStudied: totalMinutes,
    totalStudyHours,
    overallCompletionPercentage,
    goals,
    recentActivity: sessions.slice(0, 6),
    upcomingTargetDates,
  };
}

export async function getGoalProgress(
  goalId: string,
  userId: string,
  allowAnyOwner: boolean = false
) {
  const goal = await getGoalForUser(goalId, userId, allowAnyOwner);
  const topics = await computeGoalTopicsWithStatus(goalId);
  const db = getDb();
  const sessions = await db.query<{
    id: string;
    study_date: string;
    minutes: number;
    notes: string;
    topic_title: string;
  }>(
    `SELECT s.id, s.study_date, s.minutes, s.notes, t.title AS topic_title
     FROM study_sessions s
     INNER JOIN topics t ON s.topic_id = t.id
     WHERE s.goal_id = $1
     ORDER BY s.study_date DESC`,
    [goalId]
  );

  return {
    goal,
    topics,
    recentSessions: sessions.slice(0, 10).map((s) => ({
      id: s.id,
      studyDate: s.study_date,
      minutes: Number(s.minutes),
      notes: s.notes,
      topicTitle: s.topic_title,
    })),
  };
}

export async function getWeeklyAndSixWeekProgress(userId: string) {
  const db = getDb();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const dailySeries: Array<{ date: string; label: string; minutes: number; hours: number }> = [];
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 6);
  const start7Str = sevenDaysAgo.toISOString().slice(0, 10);

  const dailyRows = await db.query<{ study_date: string; total_minutes: string | number }>(
    `SELECT study_date, COALESCE(SUM(minutes), 0) AS total_minutes
     FROM study_sessions
     WHERE user_id = $1 AND study_date >= $2
     GROUP BY study_date`,
    [userId, start7Str]
  );

  const dailyMap = new Map(dailyRows.map((r) => [r.study_date, Number(r.total_minutes)]));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setUTCDate(sevenDaysAgo.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const minutes = dailyMap.get(iso) || 0;
    dailySeries.push({
      date: iso,
      label: dayNames[d.getUTCDay()],
      minutes,
      hours: Number((minutes / 60).toFixed(2)),
    });
  }

  const sixWeeksAgo = new Date(today);
  sixWeeksAgo.setUTCDate(today.getUTCDate() - 41);
  const start42Str = sixWeeksAgo.toISOString().slice(0, 10);

  const allRecentRows = await db.query<{ study_date: string; minutes: number }>(
    `SELECT study_date, minutes
     FROM study_sessions
     WHERE user_id = $1 AND study_date >= $2
     ORDER BY study_date ASC`,
    [userId, start42Str]
  );

  const sixWeekSeries: Array<{
    weekLabel: string;
    startDate: string;
    endDate: string;
    minutes: number;
    hours: number;
    sessions: number;
  }> = [];

  for (let w = 0; w < 6; w++) {
    const wStart = new Date(sixWeeksAgo);
    wStart.setUTCDate(sixWeeksAgo.getUTCDate() + w * 7);
    const wEnd = new Date(wStart);
    wEnd.setUTCDate(wStart.getUTCDate() + 6);

    const startIso = wStart.toISOString().slice(0, 10);
    const endIso = wEnd.toISOString().slice(0, 10);

    const matching = allRecentRows.filter(
      (r) => r.study_date >= startIso && r.study_date <= endIso
    );
    const minutes = matching.reduce((acc, r) => acc + Number(r.minutes), 0);

    sixWeekSeries.push({
      weekLabel: `Wk ${w + 1} (${startIso.slice(5)})`,
      startDate: startIso,
      endDate: endIso,
      minutes,
      hours: Number((minutes / 60).toFixed(1)),
      sessions: matching.length,
    });
  }

  const thisWeekMinutes = dailySeries.reduce((acc, d) => acc + d.minutes, 0);
  const sixWeekMinutes = sixWeekSeries.reduce((acc, w) => acc + w.minutes, 0);

  return {
    thisWeekMinutes,
    thisWeekHours: Number((thisWeekMinutes / 60).toFixed(1)),
    sixWeekMinutes,
    sixWeekHours: Number((sixWeekMinutes / 60).toFixed(1)),
    dailySeries,
    sixWeekSeries,
  };
}
