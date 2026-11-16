import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { goalsService } from '../../services/goals.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { GoalModal } from '../../components/goals/GoalModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/Skeleton';
import type { Goal, GoalStatus } from '../../types';

export function GoalsPage() {
  const [filter, setFilter] = useState<'all' | GoalStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsService.list,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['progress-overview'] });
  };

  const createMutation = useMutation({
    mutationFn: goalsService.create,
    onSuccess: () => {
      invalidateAll();
      setModalOpen(false);
      showToast('Study goal created', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => goalsService.update(id, data),
    onSuccess: () => {
      invalidateAll();
      setEditingGoal(null);
      setModalOpen(false);
      showToast('Study goal updated', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsService.remove(id),
    onSuccess: () => {
      invalidateAll();
      setDeletingGoal(null);
      showToast('Study goal deleted', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const filteredGoals =
    filter === 'all' ? goals : goals.filter((g) => g.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Study Goals
          </h1>
          <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Organize your curriculum into structured goals with prerequisite-gated topics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingGoal(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Study Goal
        </button>
      </div>

      {/* Filter Segmented Control */}
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/70">
        {(['all', 'active', 'paused', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
              filter === tab
                ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] shadow-sm'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-5 h-5" />}
          title="No study goals found"
          description={
            filter === 'all'
              ? 'Create your first study goal to start adding topics and prerequisite rules.'
              : `No goals match the "${filter}" status filter.`
          }
          actionLabel={filter === 'all' ? 'Create First Goal' : undefined}
          onAction={
            filter === 'all'
              ? () => {
                  setEditingGoal(null);
                  setModalOpen(true);
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
                    <span>{goal.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{goal.status}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGoal(goal);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label={`Edit ${goal.title}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingGoal(goal)}
                      className="p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label={`Delete ${goal.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <Link to={`/goals/${goal.id}`} className="block mt-2 group">
                  <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
                    {goal.title}
                  </h2>
                  {goal.description && (
                    <p className="mt-1.5 text-sm text-[#64748B] dark:text-[#94A3B8] line-clamp-2">
                      {goal.description}
                    </p>
                  )}
                </Link>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E2E8F0] dark:border-[#273449] space-y-3">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">
                    {goal.completedTopics}/{goal.totalTopics} topics · {goal.lockedTopics} locked
                  </span>
                  <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {goal.progressPercentage}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#4F46E5] dark:bg-[#818CF8]"
                    style={{ width: `${goal.progressPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                  <span>
                    {goal.totalMinutesStudied}m studied
                    {goal.targetDate ? ` · Due ${goal.targetDate}` : ''}
                  </span>
                  <Link
                    to={`/goals/${goal.id}`}
                    className="inline-flex items-center gap-1 font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline whitespace-nowrap"
                  >
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <GoalModal
        open={modalOpen}
        initialGoal={editingGoal}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setModalOpen(false);
          setEditingGoal(null);
        }}
        onSubmit={(values) => {
          if (editingGoal) {
            updateMutation.mutate({ id: editingGoal.id, data: values });
          } else {
            createMutation.mutate(values);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingGoal)}
        title="Delete Study Goal?"
        description={`Deleting "${deletingGoal?.title}" will permanently remove all its topics, prerequisite links, and logged study sessions.`}
        isLoading={deleteMutation.isPending}
        onCancel={() => setDeletingGoal(null)}
        onConfirm={() => deletingGoal && deleteMutation.mutate(deletingGoal.id)}
      />
    </div>
  );
}
