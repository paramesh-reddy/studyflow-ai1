import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import type { Goal } from '../../types';

const goalSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(140),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().min(2, 'Category is required').max(60),
  targetDate: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused']),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalModalProps {
  open: boolean;
  initialGoal?: Goal | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: GoalFormValues) => void;
}

export function GoalModal({
  open,
  initialGoal,
  isSubmitting,
  onClose,
  onSubmit,
}: GoalModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Software Engineering',
      targetDate: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: initialGoal?.title || '',
        description: initialGoal?.description || '',
        category: initialGoal?.category || 'Software Engineering',
        targetDate: initialGoal?.targetDate || '',
        status: initialGoal?.status || 'active',
      });
    }
  }, [open, initialGoal, reset]);

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
            {initialGoal ? 'Edit Study Goal' : 'Create Study Goal'}
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
              Goal Title
            </label>
            <input
              {...register('title')}
              placeholder="e.g., Distributed Systems Mastery"
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Outline key milestones and learning outcomes..."
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Category
              </label>
              <input
                {...register('category')}
                placeholder="e.g., Artificial Intelligence"
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
              />
              {errors.category && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.category.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                {...register('targetDate')}
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
              />
            </div>
          </div>

          {initialGoal && (
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

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
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isSubmitting ? 'Saving...' : initialGoal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
