import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { goalsService } from '../../services/goals.service';
import { sessionsService } from '../../services/sessions.service';
import { topicsService } from '../../services/topics.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { SessionModal } from '../../components/sessions/SessionModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/Skeleton';
import type { StudySession } from '../../types';

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [goalFilter, setGoalFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [deletingSession, setDeletingSession] = useState<StudySession | null>(null);

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingSession(null);
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsService.list,
  });

  const { data: filterTopics = [] } = useQuery({
    queryKey: ['topics', goalFilter],
    queryFn: () => topicsService.listByGoal(goalFilter),
    enabled: Boolean(goalFilter),
  });

  const { data: rules = { minSessionMinutes: 5, maxSessionMinutes: 480, maxPrerequisitesPerTopic: 5, updatedBy: null, updatedAt: '' } } =
    useQuery({
      queryKey: ['config-rules'],
      queryFn: sessionsService.getRules,
    });

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions', goalFilter, topicFilter, startDate, endDate],
    queryFn: () =>
      sessionsService.list({
        goalId: goalFilter || undefined,
        topicId: topicFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['progress-overview'] });
    queryClient.invalidateQueries({ queryKey: ['progress-weekly'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  };

  const createMut = useMutation({
    mutationFn: sessionsService.create,
    onSuccess: () => {
      invalidateAll();
      setModalOpen(false);
      showToast('Study session logged', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      sessionsService.update(id, payload),
    onSuccess: () => {
      invalidateAll();
      setEditingSession(null);
      setModalOpen(false);
      showToast('Study session updated', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => sessionsService.remove(id),
    onSuccess: () => {
      invalidateAll();
      setDeletingSession(null);
      showToast('Study session deleted', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const sessions = sessionsData?.sessions || [];
  const totalMinutes = sessionsData?.totalMinutes || 0;
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Study Sessions
          </h1>
          <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            Total shown: {totalHours} hours ({totalMinutes} min) · Allowed range:{' '}
            {rules.minSessionMinutes}–{rules.maxSessionMinutes} min per session
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingSession(null);
            setModalOpen(true);
          }}
          disabled={goals.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Log Study Session
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
            Goal
          </label>
          <select
            value={goalFilter}
            onChange={(e) => {
              setGoalFilter(e.target.value);
              setTopicFilter('');
            }}
            className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC]"
          >
            <option value="">All goals</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
            Topic
          </label>
          <select
            value={topicFilter}
            disabled={!goalFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] disabled:opacity-50"
          >
            <option value="">All topics</option>
            {filterTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
            From date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-xs tabular-nums text-[#0F172A] dark:text-[#F8FAFC]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
            To date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-xs tabular-nums text-[#0F172A] dark:text-[#F8FAFC]"
          />
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-5 h-5" />}
          title="No study sessions recorded"
          description="Log your first focused study session to track weekly study hours and feed the AI Learning Assistant."
          actionLabel={goals.length > 0 ? 'Log Study Session' : undefined}
          onAction={
            goals.length > 0
              ? () => {
                  setEditingSession(null);
                  setModalOpen(true);
                }
              : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#273449] text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Goal & Topic</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#273449] text-sm">
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 tabular-nums text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                      {s.studyDate}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                        {s.topicTitle}
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{s.goalTitle}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md">
                      {s.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap">
                      {s.minutes} min
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSession(s);
                          setModalOpen(true);
                        }}
                        className="p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                        aria-label="Edit session"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingSession(s)}
                        className="p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-400"
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SessionModal
        open={modalOpen}
        goals={goals}
        rules={rules}
        initialSession={editingSession}
        isSubmitting={createMut.isPending || updateMut.isPending}
        onClose={() => {
          setModalOpen(false);
          setEditingSession(null);
        }}
        onSubmit={(vals) => {
          if (editingSession) {
            updateMut.mutate({ id: editingSession.id, payload: vals });
          } else {
            createMut.mutate(vals);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingSession)}
        title="Delete Study Session?"
        description={`Remove the ${deletingSession?.minutes}-minute session for "${deletingSession?.topicTitle}" on ${deletingSession?.studyDate}?`}
        isLoading={deleteMut.isPending}
        onCancel={() => setDeletingSession(null)}
        onConfirm={() => deletingSession && deleteMut.mutate(deletingSession.id)}
      />
    </div>
  );
}
