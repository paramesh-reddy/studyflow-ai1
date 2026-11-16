export type UserRole = 'learner' | 'mentor';
export type GoalStatus = 'active' | 'completed' | 'paused';
export type TopicStatus = 'locked' | 'available' | 'completed';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Goal {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  targetDate: string | null;
  status: GoalStatus;
  createdAt: string;
  totalTopics: number;
  completedTopics: number;
  availableTopics: number;
  lockedTopics: number;
  progressPercentage: number;
  totalMinutesStudied: number;
}

export interface PrerequisiteSummary {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Topic {
  id: string;
  goalId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  status: TopicStatus;
  isUnlocked: boolean;
  prerequisites: PrerequisiteSummary[];
  missingPrerequisites: Array<{ id: string; title: string }>;
}

export interface StudySession {
  id: string;
  userId: string;
  goalId: string;
  goalTitle: string;
  topicId: string;
  topicTitle: string;
  studyDate: string;
  minutes: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  minSessionMinutes: number;
  maxSessionMinutes: number;
  maxPrerequisitesPerTopic: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface ProgressOverview {
  totalGoals: number;
  totalTopics: number;
  completedTopics: number;
  availableTopics: number;
  lockedTopics: number;
  totalMinutesStudied: number;
  totalStudyHours: number;
  overallCompletionPercentage: number;
  goals: Goal[];
  recentActivity: StudySession[];
  upcomingTargetDates: Array<{
    goalId: string;
    title: string;
    category: string;
    targetDate: string;
    progressPercentage: number;
  }>;
}

export interface WeeklyProgress {
  thisWeekMinutes: number;
  thisWeekHours: number;
  sixWeekMinutes: number;
  sixWeekHours: number;
  dailySeries: Array<{ date: string; label: string; minutes: number; hours: number }>;
  sixWeekSeries: Array<{
    weekLabel: string;
    startDate: string;
    endDate: string;
    minutes: number;
    hours: number;
    sessions: number;
  }>;
}

export interface RagSource {
  type: 'goal' | 'topic' | 'session' | 'document';
  label: string;
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: RagSource[];
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface LearningDocument {
  id: string;
  userId: string;
  goalId: string | null;
  goalTitle: string | null;
  title: string;
  content: string;
  chunkCount: number;
  createdAt: string;
}

export interface LearnerSummary {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  totalGoals: number;
  totalTopics: number;
  completedTopics: number;
  lockedTopics: number;
  availableTopics: number;
  totalStudyHours: number;
  overallCompletionPercentage: number;
}

export interface LearnerDetail {
  learner: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
  overview: ProgressOverview;
  weekly: WeeklyProgress;
  goals: Array<Goal & { topics: Topic[] }>;
  sessions: StudySession[];
}
