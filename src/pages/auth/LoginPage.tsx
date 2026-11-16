import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../services/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      navigate(user.role === 'mentor' ? '/mentor' : '/dashboard');
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Invalid credentials'));
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1120] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5">
            <img src="/logo.svg" alt="StudyFlow AI logo" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              StudyFlow AI
            </span>
          </div>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
            Sign in to manage goals, prerequisites, and study analytics.
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-6 sm:p-8 shadow-sm">
          {serverError && (
            <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-sm text-rose-700 dark:text-rose-300">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="alex@studyflow.ai"
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                Password
              </label>
              <input
                type="password"
                {...register('password')}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#273449] space-y-2.5">
            <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
              Quick demo accounts
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillDemo('alex@studyflow.ai', 'LearnerPass123!')}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] dark:border-[#273449] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                Fill Demo Learner
              </button>
              <button
                type="button"
                onClick={() => fillDemo('mentor@studyflow.ai', 'MentorPass123!')}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] dark:border-[#273449] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                Fill Demo Mentor
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
          New to StudyFlow AI?{' '}
          <Link
            to="/register"
            className="font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline"
          >
            Create a learner account
          </Link>
        </p>
      </div>
    </div>
  );
}
