import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Users } from 'lucide-react';
import { mentorService } from '../../services/mentor.service';
import { CardSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

export function MentorDashboardPage() {
  const [search, setSearch] = useState('');

  const { data: learners = [], isLoading } = useQuery({
    queryKey: ['mentor-learners', search],
    queryFn: () => mentorService.listLearners(search),
  });

  const avgCompletion =
    learners.length > 0
      ? Math.round(
          learners.reduce((acc, l) => acc + l.overallCompletionPercentage, 0) / learners.length
        )
      : 0;
  const totalHours = learners.reduce((acc, l) => acc + l.totalStudyHours, 0).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Learner Cohort Oversight
          </h1>
          <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Monitor learner goals, prerequisite progress, and study consistency.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learners by name or email..."
            className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] pl-9 pr-3.5 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Registered Learners
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
            {learners.length}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Average Completion
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#4F46E5] dark:text-[#818CF8]">
            {avgCompletion}%
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5">
          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Combined Study Hours
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
            {totalHours}h
          </p>
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : learners.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="No learners match your search"
          description="Try clearing the search query or wait for new learners to register."
        />
      ) : (
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#273449] text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-4 text-right">Goals</th>
                  <th className="py-3 px-4 text-right">Completed / Total</th>
                  <th className="py-3 px-4 text-right">Locked</th>
                  <th className="py-3 px-4 text-right">Study Hours</th>
                  <th className="py-3 px-4 text-right">Completion</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#273449] text-sm">
                {learners.map((learner) => (
                  <tr
                    key={learner.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                        {learner.name}
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        {learner.email}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">{learner.totalGoals}</td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      {learner.completedTopics} / {learner.totalTopics}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-amber-700 dark:text-amber-400">
                      {learner.lockedTopics}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      {learner.totalStudyHours}h
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums font-semibold">
                      {learner.overallCompletionPercentage}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/mentor/learners/${learner.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline whitespace-nowrap"
                      >
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
