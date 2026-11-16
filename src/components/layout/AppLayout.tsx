import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  SlidersHorizontal,
  Target,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FloatingAssistant } from '../ai-assistant/FloatingAssistant';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const LEARNER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/goals', label: 'Study Goals', icon: Target },
  { to: '/sessions', label: 'Study Sessions', icon: Clock },
  { to: '/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MENTOR_NAV: NavItem[] = [
  { to: '/mentor', label: 'Learners', icon: Users },
  { to: '/mentor/config', label: 'Business Rules', icon: SlidersHorizontal },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function getBreadcrumb(pathname: string, isMentor: boolean): string {
  if (pathname.startsWith('/mentor/learners/')) return 'Learners / Learner Progress';
  if (pathname.startsWith('/mentor/config')) return 'Administration / Business Rules';
  if (pathname.startsWith('/mentor')) return 'Mentor / Learners';
  if (pathname.startsWith('/goals/')) return 'Study Goals / Goal & Prerequisites';
  if (pathname.startsWith('/goals')) return 'Workspace / Study Goals';
  if (pathname.startsWith('/sessions')) return 'Workspace / Study Sessions';
  if (pathname.startsWith('/assistant')) return 'Workspace / AI Learning Assistant';
  if (pathname.startsWith('/settings')) return 'Account / Settings & Theme';
  return isMentor ? 'Mentor / Learners' : 'Workspace / Overview';
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isMentor = user?.role === 'mentor';
  const navItems = isMentor ? MENTOR_NAV : LEARNER_NAV;
  const breadcrumb = getBreadcrumb(location.pathname, isMentor);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#111827] border-r border-[#E2E8F0] dark:border-[#273449]">
      <div>
        <div className="flex h-14 items-center justify-between px-5 border-b border-[#E2E8F0] dark:border-[#273449]">
          <NavLink
            to={isMentor ? '/mentor' : '/dashboard'}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap shrink-0"
          >
            <img src="/logo.svg" alt="StudyFlow AI logo" className="w-6 h-6 rounded-md" />
            <span>StudyFlow AI</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 text-[#64748B] dark:text-[#94A3B8]"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/mentor' || item.to === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#4F46E5]/10 dark:bg-[#818CF8]/15 text-[#4F46E5] dark:text-[#818CF8]'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#273449] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] dark:bg-[#818CF8] text-xs font-semibold text-white dark:text-slate-950">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
              {user?.name}
            </p>
            <p className="truncate text-xs text-[#64748B] dark:text-[#94A3B8]">
              {isMentor ? 'Mentor Admin' : 'Learner'} · {user?.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] dark:border-[#273449] px-3 py-2 text-xs font-medium text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[248px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">{sidebarContent}</aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#273449] bg-white/90 dark:bg-[#111827]/90 backdrop-blur-sm px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="truncate text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
              {breadcrumb}
            </span>
          </div>

          {!isMentor && (
            <button
              type="button"
              onClick={() => navigate('/sessions?new=1')}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Log Study Session
            </button>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {!isMentor && location.pathname !== '/assistant' && <FloatingAssistant />}
    </div>
  );
}
