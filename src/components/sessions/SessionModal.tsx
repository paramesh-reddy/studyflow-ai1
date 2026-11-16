import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { topicsService } from '../../services/topics.service';
import type { AppConfig, Goal, StudySession } from '../../types';

interface SessionModalProps {
  open: boolean;
  goals: Goal[];
  rules: AppConfig;
  initialSession?: StudySession | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    goalId: string;
    topicId: string;
    studyDate: string;
    minutes: number;
    notes?: string;
  }) => void;
}

export function SessionModal({
  open,
  goals,
  rules,
  initialSession,
  isSubmitting,
  onClose,
  onSubmit,
}: SessionModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const schema = useMemo(
    () =>
      z.object({
        goalId: z.string().min(1, 'Select a study goal'),
        topicId: z.string().min(1, 'Select a topic'),
        studyDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')
          .refine((d) => d <= today, 'Study date cannot be in the future'),
        minutes: z.coerce
          .number()
          .int('Must be a whole number of minutes')
          .min(rules.minSessionMinutes, `Minimum is ${rules.minSessionMinutes} minutes`)
          .max(rules.maxSessionMinutes, `Maximum is ${rules.maxSessionMinutes} minutes`),
        notes: z.string().max(2000).optional(),
      }),
    [rules.minSessionMinutes, rules.maxSessionMinutes, today]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      goalId: goals[0]?.id || '',
      topicId: '',
      studyDate: today,
      minutes: Math.max(30, rules.minSessionMinutes),
      notes: '',
    },
  });

  const selectedGoalId = watch('goalId');

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', selectedGoalId],
    queryFn: () => topicsService.listByGoal(selectedGoalId),
    enabled: open && Boolean(selectedGoalId),
  });

  useEffect(() => {
    if (open) {
      reset({
        goalId: initialSession?.goalId || goals[0]?.id || '',
        topicId: initialSession?.topicId || '',
        studyDate: initialSession?.studyDate || today,
        minutes: initialSession?.minutes || Math.max(30, rules.minSessionMinutes),
        notes: initialSession?.notes || '',
      });
    }
  }, [open, initialSession, goals, today, rules.minSessionMinutes, reset]);

  useEffect(() => {
    if (topics.length > 0) {
      const currentTopic = watch('topicId');
      if (!topics.some((t) => t.id === currentTopic)) {
        setValue('topicId', topics[0].id);
      }
    } else {
      setValue('topicId', '');
    }
  }, [topics, setValue, watch]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#273449] px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {initialSession ? 'Edit Study Session' : 'Log Study Session'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] p-1"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((vals: any) => onSubmit(vals))} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Study Goal
              </label>
              <select
                {...register('goalId')}
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
              {errors.goalId && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {String(errors.goalId.message)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Topic
              </label>
              <select
                {...register('topicId')}
                disabled={topics.length === 0}
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8] disabled:opacity-50"
              >
                {topics.length === 0 ? (
                  <option value="">No topics in this goal</option>
                ) : (
                  topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))
                )}
              </select>
              {errors.topicId && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {String(errors.topicId.message)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Study Date
              </label>
              <input
                type="date"
                max={today}
                {...register('studyDate')}
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm tabular-nums text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
              />
              {errors.studyDate && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {String(errors.studyDate.message)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Minutes Studied ({rules.minSessionMinutes}–{rules.maxSessionMinutes})
              </label>
              <input
                type="number"
                {...register('minutes')}
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm tabular-nums text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
              />
              {errors.minutes && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {String(errors.minutes.message)}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
              Session Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Key takeaways, concepts practiced, or blockers to review..."
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E2E8F0] dark:border-[#273449] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || topics.length === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isSubmitting ? 'Saving...' : initialSession ? 'Save Session' : 'Log Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
