import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  GitBranch,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { goalsService } from '../../services/goals.service';
import { topicsService } from '../../services/topics.service';
import { sessionsService } from '../../services/sessions.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { TopicStatusText } from '../../components/common/StatusIndicator';
import { PrerequisiteGraph } from '../../components/topics/PrerequisiteGraph';
import { TopicModal } from '../../components/topics/TopicModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/Skeleton';
import type { Topic } from '../../types';

export function GoalDetailPage() {
  const { goalId = '' } = useParams();
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [showGraph, setShowGraph] = useState(true);

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: goal, isLoading: loadingGoal } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalsService.get(goalId),
    enabled: Boolean(goalId),
  });

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['topics', goalId],
    queryFn: () => topicsService.listByGoal(goalId),
    enabled: Boolean(goalId),
  });

  const { data: rules } = useQuery({
    queryKey: ['config-rules'],
    queryFn: sessionsService.getRules,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
    queryClient.invalidateQueries({ queryKey: ['topics', goalId] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['progress-overview'] });
  };

  const createTopicMut = useMutation({
    mutationFn: (payload: any) => topicsService.create(goalId, payload),
    onSuccess: () => {
      invalidateAll();
      setTopicModalOpen(false);
      showToast('Topic added', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const updateTopicMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      topicsService.update(id, payload),
    onSuccess: () => {
      invalidateAll();
      setEditingTopic(null);
      setTopicModalOpen(false);
      showToast('Topic updated', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const deleteTopicMut = useMutation({
    mutationFn: (id: string) => topicsService.remove(id),
    onSuccess: () => {
      invalidateAll();
      setDeletingTopic(null);
      showToast('Topic deleted', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => topicsService.complete(id),
    onSuccess: () => {
      invalidateAll();
      showToast('Topic completed — dependent topics updated', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const reopenMut = useMutation({
    mutationFn: (id: string) => topicsService.reopen(id),
    onSuccess: () => {
      invalidateAll();
      showToast('Topic reopened — incomplete dependents relocked', 'info');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  if (loadingGoal || loadingTopics) {
    return (
      <div className="space-y-6">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={5} />
      </div>
    );
  }

  if (!goal) {
    return (
      <EmptyState
        icon={<GitBranch className="w-5 h-5" />}
        title="Study goal not found"
        description="This goal may have been removed or you do not have access to it."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            to="/goals"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Study Goals
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            {goal.title}
          </h1>
          {goal.description && (
            <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8] max-w-2xl">
              {goal.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            <span>{goal.category}</span>
            <span aria-hidden="true">·</span>
            <span>
              {goal.completedTopics}/{goal.totalTopics} completed ({goal.progressPercentage}%)
            </span>
            <span aria-hidden="true">·</span>
            <span>{goal.availableTopics} available</span>
            <span aria-hidden="true">·</span>
            <span>{goal.lockedTopics} locked</span>
            {goal.targetDate && (
              <>
                <span aria-hidden="true">·</span>
                <span>Target {goal.targetDate}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowGraph((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
          >
            <GitBranch className="w-3.5 h-3.5" />
            {showGraph ? 'Hide Graph' : 'Show Graph'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTopic(null);
              setTopicModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Topic
          </button>
        </div>
      </div>

      {/* Prerequisite DAG Visualization */}
      {showGraph && topics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
            <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
              Prerequisite Dependency Graph
            </span>
            <span>Click any topic node to edit its prerequisites</span>
          </div>
          <PrerequisiteGraph
            topics={topics}
            onSelectTopic={(t) => {
              setEditingTopic(t);
              setTopicModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Topics List */}
      {topics.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="w-5 h-5" />}
          title="No topics in this goal yet"
          description="Add your first topic and define prerequisite chains to control unlocking order."
          actionLabel="Add First Topic"
          onAction={() => {
            setEditingTopic(null);
            setTopicModalOpen(true);
          }}
        />
      ) : (
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] divide-y divide-[#E2E8F0] dark:divide-[#273449]">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {topic.title}
                  </h3>
                  <TopicStatusText status={topic.status} />
                  <span className="text-xs tabular-nums text-[#64748B] dark:text-[#94A3B8]">
                    Est. {topic.estimatedMinutes} min
                  </span>
                </div>

                {topic.description && (
                  <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
                    {topic.description}
                  </p>
                )}

                {topic.prerequisites.length > 0 && (
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Prerequisites:{' '}
                    {topic.prerequisites
                      .map((p) => `${p.title} (${p.isCompleted ? 'done' : 'incomplete'})`)
                      .join(' · ')}
                  </p>
                )}

                {topic.status === 'locked' && topic.missingPrerequisites.length > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Locked until completed:{' '}
                    {topic.missingPrerequisites.map((m) => m.title).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {topic.status === 'completed' ? (
                  <button
                    type="button"
                    onClick={() => reopenMut.mutate(topic.id)}
                    disabled={reopenMut.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E2E8F0] dark:border-[#273449] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reopen
                  </button>
                ) : topic.status === 'available' ? (
                  <button
                    type="button"
                    onClick={() => completeMut.mutate(topic.id)}
                    disabled={completeMut.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Complete
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => completeMut.mutate(topic.id)}
                    title="Locked — prerequisites incomplete"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 whitespace-nowrap"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Locked
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditingTopic(topic);
                    setTopicModalOpen(true);
                  }}
                  className="p-2 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={`Edit ${topic.title}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingTopic(topic)}
                  className="p-2 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={`Delete ${topic.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TopicModal
        open={topicModalOpen}
        initialTopic={editingTopic}
        availableTopics={topics}
        maxPrerequisites={rules?.maxPrerequisitesPerTopic ?? 5}
        isSubmitting={createTopicMut.isPending || updateTopicMut.isPending}
        onClose={() => {
          setTopicModalOpen(false);
          setEditingTopic(null);
        }}
        onSubmit={(payload) => {
          if (editingTopic) {
            updateTopicMut.mutate({ id: editingTopic.id, payload });
          } else {
            createTopicMut.mutate(payload);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingTopic)}
        title="Delete Topic?"
        description={`Deleting "${deletingTopic?.title}" will remove it from prerequisite chains and delete its associated study sessions.`}
        isLoading={deleteTopicMut.isPending}
        onCancel={() => setDeletingTopic(null)}
        onConfirm={() => deletingTopic && deleteTopicMut.mutate(deletingTopic.id)}
      />
    </div>
  );
}
