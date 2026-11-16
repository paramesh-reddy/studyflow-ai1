import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import type { Topic } from '../../types';

const topicSchema = z.object({
  title: z.string().trim().min(2, 'Topic title must be at least 2 characters').max(140),
  description: z.string().trim().max(1000).optional(),
  estimatedMinutes: z.coerce
    .number()
    .int('Must be a whole number')
    .min(5, 'Minimum 5 minutes')
    .max(10000, 'Maximum 10000 minutes'),
});

type TopicFormValues = z.infer<typeof topicSchema>;

interface TopicModalProps {
  open: boolean;
  initialTopic?: Topic | null;
  availableTopics: Topic[];
  maxPrerequisites: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: TopicFormValues & { prerequisiteIds: string[] }) => void;
}

export function TopicModal({
  open,
  initialTopic,
  availableTopics,
  maxPrerequisites,
  isSubmitting,
  onClose,
  onSubmit,
}: TopicModalProps) {
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      estimatedMinutes: 60,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: initialTopic?.title || '',
        description: initialTopic?.description || '',
        estimatedMinutes: initialTopic?.estimatedMinutes ?? 60,
      });
      setSelectedPrereqs(initialTopic?.prerequisites.map((p) => p.id) || []);
    }
  }, [open, initialTopic, reset]);

  if (!open) return null;

  const candidatePrereqs = availableTopics.filter((t) => t.id !== initialTopic?.id);

  const togglePrereq = (id: string) => {
    setSelectedPrereqs((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= maxPrerequisites) {
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#273449] px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {initialTopic ? 'Edit Topic & Prerequisites' : 'Add Topic'}
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

        <form
          onSubmit={handleSubmit((vals) =>
            onSubmit({ ...vals, prerequisiteIds: selectedPrereqs })
          )}
          className="p-6 space-y-4 overflow-y-auto"
        >
          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
              Topic Title
            </label>
            <input
              {...register('title')}
              placeholder="e.g., FastAPI & REST Services"
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
              rows={2}
              placeholder="Concepts covered in this topic..."
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              {...register('estimatedMinutes')}
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm tabular-nums text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
            />
            {errors.estimatedMinutes && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.estimatedMinutes.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                Prerequisites
              </label>
              <span className="text-xs tabular-nums text-[#64748B] dark:text-[#94A3B8]">
                {selectedPrereqs.length} / {maxPrerequisites} selected
              </span>
            </div>
            {candidatePrereqs.length === 0 ? (
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Add more topics to this goal before assigning prerequisites.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] divide-y divide-[#E2E8F0] dark:divide-[#273449]">
                {candidatePrereqs.map((candidate) => {
                  const checked = selectedPrereqs.includes(candidate.id);
                  const disabled = !checked && selectedPrereqs.length >= maxPrerequisites;
                  return (
                    <label
                      key={candidate.id}
                      className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 text-[#0F172A] dark:text-[#F8FAFC]">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => togglePrereq(candidate.id)}
                          className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5]"
                        />
                        {candidate.title}
                      </span>
                      <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        {candidate.isCompleted ? 'Completed' : 'Incomplete'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
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
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isSubmitting ? 'Saving...' : initialTopic ? 'Save Topic' : 'Add Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
