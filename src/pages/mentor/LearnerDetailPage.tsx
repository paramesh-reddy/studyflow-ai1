import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { mentorService } from '../../services/mentor.service';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import { TopicStatusText } from '../../components/common/StatusIndicator';
import {
  SixWeekActivityChart,
  WeeklyStudyBarChart,
} from '../../components/charts/StudyCharts';

export function LearnerDetailPage() {
  const { learnerId = '' } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['mentor-learner-detail', learnerId],
    queryFn: () => mentorService.getLearnerDetail(learnerId),
    enabled: Boolean(learnerId),
  });

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/mentor"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Learners
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          {data.learner.name}
        </h1>
        <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
          {data.learner.email} · {data.overview.totalGoals} goals ·{' '}
          {data.overview.totalStudyHours}h total study time
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Completion</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">
            {data.overview.overallCompletionPercentage}%
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Completed Topics</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {data.overview.completedTopics}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Available Topics</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#4F46E5] dark:text-[#818CF8]">
            {data.overview.availableTopics}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Locked Topics</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {data.overview.lockedTopics}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <h2 className="text-sm font-semibold mb-4">Weekly Study Time</h2>
          <WeeklyStudyBarChart data={data.weekly.dailySeries} />
        </div>
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <h2 className="text-sm font-semibold mb-4">6-Week Study Activity</h2>
          <SixWeekActivityChart data={data.weekly.sixWeekSeries} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          Goals & Prerequisite Statuses
        </h2>
        {data.goals.map((goal) => (
          <div
            key={goal.id}
            className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  {goal.title}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                  {goal.category} · {goal.completedTopics}/{goal.totalTopics} completed (
                  {goal.progressPercentage}%) · {goal.totalMinutesStudied}m studied
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {goal.topics.map((topic) => (
                <div
                  key={topic.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                      {topic.title}
                    </span>
                    {topic.missingPrerequisites.length > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Blocked by: {topic.missingPrerequisites.map((m) => m.title).join(', ')}
                      </p>
                    )}
                  </div>
                  <TopicStatusText status={topic.status} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5 space-y-4">
        <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          Recent Study Sessions
        </h2>
        <div className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
          {data.sessions.map((s) => (
            <div key={s.id} className="py-3 flex items-start justify-between gap-4 text-sm">
              <div>
                <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{s.topicTitle}</p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {s.goalTitle}
                  {s.notes ? ` · ${s.notes}` : ''}
                </p>
              </div>
              <div className="text-right text-xs tabular-nums shrink-0">
                <p className="font-semibold">{s.minutes} min</p>
                <p className="text-[#64748B] dark:text-[#94A3B8]">{s.studyDate}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
