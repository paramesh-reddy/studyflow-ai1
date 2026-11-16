import { api } from './api';
import type { AppConfig, StudySession } from '../types';

export const sessionsService = {
  async list(filters?: {
    goalId?: string;
    topicId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ sessions: StudySession[]; totalMinutes: number }> {
    const { data } = await api.get<{ sessions: StudySession[]; totalMinutes: number }>('/sessions', {
      params: filters,
    });
    return data;
  },
  async create(payload: {
    goalId: string;
    topicId: string;
    studyDate: string;
    minutes: number;
    notes?: string;
  }): Promise<StudySession> {
    const { data } = await api.post<{ session: StudySession }>('/sessions', payload);
    return data.session;
  },
  async update(
    sessionId: string,
    payload: {
      goalId?: string;
      topicId?: string;
      studyDate?: string;
      minutes?: number;
      notes?: string;
    }
  ): Promise<StudySession> {
    const { data } = await api.put<{ session: StudySession }>(`/sessions/${sessionId}`, payload);
    return data.session;
  },
  async remove(sessionId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}`);
  },
  async getRules(): Promise<AppConfig> {
    const { data } = await api.get<AppConfig>('/config/rules');
    return data;
  },
};
