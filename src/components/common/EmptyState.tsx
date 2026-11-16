import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-10 text-center flex flex-col items-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] text-[#64748B] dark:text-[#94A3B8]">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-4 py-2 text-sm font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors whitespace-nowrap shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
