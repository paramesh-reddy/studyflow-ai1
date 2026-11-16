import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, Target } from 'lucide-react';
import { progressService } from '../../services/progress.service';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  GoalCompletionChart,
  SixWeekActivityChart,
  WeeklyStudyBarChart,
} from '../../components/charts/StudyCharts';

export function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['progress-overview'],
    queryFn: progressService.getOverview,
  });

  const { data: weekly, isLoading: loadingWeekly } = useQuery({
    queryKey: ['progress-weekly'],
    queryFn: progressService.getWeekly,
  });

  if (loadingOverview || loadingWeekly) {
    return <DashboardSkeleton />;
  }

  if (!overview || !weekly) {
    return (
      <EmptyState
        icon={<Target className="w-5 h-5" />}
        title="Unable to load progress overview"
        description="Please refresh the page to retry loading your study metrics."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Study Progress Overview
          </h1>
          <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Live metrics across your study goals, prerequisite unlocks, and logged study hours.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
          <span>This week: {weekly.thisWeekHours}h</span>
          <span aria-hidden="true">·</span>
          <span>Last 6 weeks: {weekly.sixWeekHours}h</span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Overall Completion
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
            {overview.overallCompletionPercentage}%
          </p>
          <p className="mt-1 text-xs tabular-nums text-[#64748B] dark:text-[#94A3B8]">
            {overview.completedTopics} of {overview.totalTopics} topics completed
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Total Study Time
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
            {overview.totalStudyHours}h
          </p>
          <p className="mt-1 text-xs tabular-nums text-[#64748B] dark:text-[#94A3B8]">
            {overview.totalMinutesStudied} minutes across {overview.totalGoals} goals
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Available Topics
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#4F46E5] dark:text-[#818CF8]">
            {overview.availableTopics}
          </p>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
            Prerequisites satisfied
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Locked Topics
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
            {overview.lockedTopics}
          </p>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
            Awaiting prerequisites
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Weekly Study Time
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Daily minutes logged over the past 7 days
              </p>
            </div>
            <span className="text-xs font-medium tabular-nums text-[#4F46E5] dark:text-[#818CF8]">
              {weekly.thisWeekMinutes} min total
            </span>
          </div>
          <WeeklyStudyBarChart data={weekly.dailySeries} />
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                6-Week Study Activity
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Weekly cumulative hours across the last six weeks
              </p>
            </div>
            <span className="text-xs font-medium tabular-nums text-[#64748B] dark:text-[#94A3B8]">
              {weekly.sixWeekHours} hrs
            </span>
          </div>
          <SixWeekActivityChart data={weekly.sixWeekSeries} />
        </div>
      </div>

      {/* Goal Progress & Goal Completion Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Study Goals Progress
            </h2>
            <Link
              to="/goals"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline"
            >
              View all goals <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {overview.goals.length === 0 ? (
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] py-4">
              No study goals yet. Create your first goal to organize topics and prerequisites.
            </p>
          ) : (
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {overview.goals.map((goal) => (
                <Link
                  key={goal.id}
                  to={`/goals/${goal.id}`}
                  className="block py-3.5 first:pt-1 last:pb-1 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                        {goal.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                        <span>{goal.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {goal.completedTopics}/{goal.totalTopics} topics
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{goal.totalMinutesStudied}m studied</span>
                        {goal.targetDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Target {goal.targetDate}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[#0F172A] dark:text-[#F8FAFC] shrink-0">
                      {goal.progressPercentage}%
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#4F46E5] dark:bg-[#818CF8] transition-all"
                      style={{ width: `${goal.progressPercentage}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
            Goal Completion Comparison
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-3">
            Percentage of topics completed per goal
          </p>
          {overview.goals.length > 0 ? (
            <GoalCompletionChart goals={overview.goals} />
          ) : (
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] py-8 text-center">
              Add goals to visualize completion rates.
            </p>
          )}
        </div>
      </div>

      {/* Recent Sessions & Upcoming Target Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Recent Study Activity
            </h2>
            <Link
              to="/sessions"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline"
            >
              All sessions <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {overview.recentActivity.length === 0 ? (
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] py-4">
              No study sessions logged yet.
            </p>
          ) : (
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {overview.recentActivity.map((s) => (
                <div key={s.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {s.topicTitle}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">
                      {s.goalTitle}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <p className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#64748B] dark:text-[#94A3B8]" />
                      {s.minutes}m
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{s.studyDate}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-4">
            Upcoming Target Dates
          </h2>
          {overview.upcomingTargetDates.length === 0 ? (
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
              No active target dates scheduled.
            </p>
          ) : (
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {overview.upcomingTargetDates.map((item) => (
                <Link
                  key={item.goalId}
                  to={`/goals/${item.goalId}`}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 hover:opacity-80"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3 h-3" />
                      {item.targetDate}
                    </p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-[#4F46E5] dark:text-[#818CF8]">
                    {item.progressPercentage}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
