import { CheckCircle2, CircleDot, Lock } from 'lucide-react';
import type { TopicStatus } from '../../types';

/**
 * Unboxed inline status indicator pairing icon + explicit text (no pill badges).
 */
export function TopicStatusText({ status }: { status: TopicStatus }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        Completed
      </span>
    );
  }
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] whitespace-nowrap shrink-0">
        <CircleDot className="w-3.5 h-3.5 shrink-0" />
        Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
      <Lock className="w-3.5 h-3.5 shrink-0" />
      Locked
    </span>
  );
}
