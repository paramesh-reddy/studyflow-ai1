import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mentorService } from '../../services/mentor.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { CardSkeleton } from '../../components/common/Skeleton';

const configSchema = z
  .object({
    minSessionMinutes: z.coerce.number().int().min(1).max(1440),
    maxSessionMinutes: z.coerce.number().int().min(1).max(1440),
    maxPrerequisitesPerTopic: z.coerce.number().int().min(0).max(50),
  })
  .refine((d) => d.minSessionMinutes <= d.maxSessionMinutes, {
    message: 'Minimum minutes cannot exceed maximum minutes',
    path: ['minSessionMinutes'],
  });

type ConfigFormValues = z.infer<typeof configSchema>;

export function AdminConfigPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: mentorService.getAdminConfig,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema) as any,
  });

  useEffect(() => {
    if (config) {
      reset({
        minSessionMinutes: config.minSessionMinutes,
        maxSessionMinutes: config.maxSessionMinutes,
        maxPrerequisitesPerTopic: config.maxPrerequisitesPerTopic,
      });
    }
  }, [config, reset]);

  const mutation = useMutation({
    mutationFn: mentorService.updateAdminConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      queryClient.invalidateQueries({ queryKey: ['config-rules'] });
      showToast('Business rules updated immediately across all API validations', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  if (isLoading) {
    return <CardSkeleton rows={5} />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Business Rules Configuration
        </h1>
        <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Changes saved here are stored in the database and immediately enforced by backend session and prerequisite validators without server restarts.
        </p>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-6">
        <form
          onSubmit={handleSubmit((vals) => mutation.mutate(vals))}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Minimum Study Session (minutes)
              </label>
              <input
                type="number"
                {...register('minSessionMinutes')}
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm tabular-nums"
              />
              {errors.minSessionMinutes && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.minSessionMinutes.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Maximum Study Session (minutes)
              </label>
              <input
                type="number"
                {...register('maxSessionMinutes')}
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm tabular-nums"
              />
              {errors.maxSessionMinutes && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.maxSessionMinutes.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
              Maximum Prerequisites per Topic
            </label>
            <input
              type="number"
              {...register('maxPrerequisitesPerTopic')}
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2 text-sm tabular-nums"
            />
            <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
              Controls the maximum direct prerequisite links allowed on any single topic.
            </p>
            {errors.maxPrerequisitesPerTopic && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.maxPrerequisitesPerTopic.message}
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {config?.updatedAt ? `Last updated: ${config.updatedAt.slice(0, 10)}` : ''}
            </span>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
