import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/learner/DashboardPage';
import { GoalsPage } from './pages/goals/GoalsPage';
import { GoalDetailPage } from './pages/goals/GoalDetailPage';
import { SessionsPage } from './pages/sessions/SessionsPage';
import { AssistantPage } from './pages/assistant/AssistantPage';
import { MentorDashboardPage } from './pages/mentor/MentorDashboardPage';
import { LearnerDetailPage } from './pages/mentor/LearnerDetailPage';
import { AdminConfigPage } from './pages/mentor/AdminConfigPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { NotFoundPage } from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1,
    },
  },
});

function RoleRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'mentor' ? '/mentor' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<RoleRedirect />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Authenticated App Shell */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Learner Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['learner']}>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/goals"
                    element={
                      <ProtectedRoute allowedRoles={['learner']}>
                        <GoalsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/goals/:goalId"
                    element={
                      <ProtectedRoute allowedRoles={['learner']}>
                        <GoalDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sessions"
                    element={
                      <ProtectedRoute allowedRoles={['learner']}>
                        <SessionsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/assistant"
                    element={
                      <ProtectedRoute allowedRoles={['learner']}>
                        <AssistantPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Mentor / Admin Routes */}
                  <Route
                    path="/mentor"
                    element={
                      <ProtectedRoute allowedRoles={['mentor']}>
                        <MentorDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/mentor/learners/:learnerId"
                    element={
                      <ProtectedRoute allowedRoles={['mentor']}>
                        <LearnerDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/mentor/config"
                    element={
                      <ProtectedRoute allowedRoles={['mentor']}>
                        <AdminConfigPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Shared Settings */}
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
