import { Monitor, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemePreference } from '../../types';

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: 'light',
    label: 'Light',
    description: 'Crisp alabaster surface with high-contrast slate ink',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Deep midnight slate surface tuned for low-light study',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Automatically match your operating system appearance',
    icon: Monitor,
  },
];

export function SettingsPage() {
  const { user } = useAuth();
  const { preference, setPreference } = useTheme();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Manage your account profile and workspace theme preferences.
        </p>
      </div>

      {/* Account Summary */}
      <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          Account Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Name</p>
            <p className="mt-0.5 font-medium text-[#0F172A] dark:text-[#F8FAFC]">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Email</p>
            <p className="mt-0.5 font-medium text-[#0F172A] dark:text-[#F8FAFC]">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Role</p>
            <p className="mt-0.5 font-medium capitalize text-[#0F172A] dark:text-[#F8FAFC]">
              {user?.role === 'mentor' ? 'Mentor / Administrator' : 'Learner'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Member since</p>
            <p className="mt-0.5 font-medium tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
              {user?.createdAt?.slice(0, 10)}
            </p>
          </div>
        </div>
      </div>

      {/* Theme Switcher */}
      <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Appearance
          </h2>
          <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
            Choose Light, Dark, or System mode. Your selection is saved across sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = preference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreference(opt.value)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  active
                    ? 'border-[#4F46E5] dark:border-[#818CF8] bg-[#4F46E5]/5 dark:bg-[#818CF8]/10'
                    : 'border-[#E2E8F0] dark:border-[#273449] hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    active
                      ? 'text-[#4F46E5] dark:text-[#818CF8]'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                />
                <p className="mt-2.5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  {opt.label}
                </p>
                <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] leading-snug">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
