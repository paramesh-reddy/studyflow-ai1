import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1120] p-4">
      <div className="text-center space-y-4">
        <p className="text-sm font-semibold text-[#4F46E5] dark:text-[#818CF8]">404</p>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Page not found</h1>
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          The page you are looking for does not exist or has moved.
        </p>
        <div>
          <Link
            to="/dashboard"
            className="inline-block px-4 py-2 text-sm font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
