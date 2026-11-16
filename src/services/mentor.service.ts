import { api } from './api';
import type { AppConfig, LearnerDetail, LearnerSummary } from '../types';

export const mentorService = {
  async listLearners(search?: string): Promise<LearnerSummary[]> {
    const { data } = await api.get<{ learners: LearnerSummary[] }>('/mentor/learners', {
      params: search ? { search } : undefined,
    });
    return data.learners;
  },
  async getLearnerDetail(learnerId: string): Promise<LearnerDetail> {
    const { data } = await api.get<LearnerDetail>(`/mentor/learners/${learnerId}`);
    return data;
  },
  async getAdminConfig(): Promise<AppConfig> {
    const { data } = await api.get<AppConfig>('/admin/config');
    return data;
  },
  async updateAdminConfig(payload: {
    minSessionMinutes: number;
    maxSessionMinutes: number;
    maxPrerequisitesPerTopic: number;
  }): Promise<AppConfig> {
    const { data } = await api.put<AppConfig>('/admin/config', payload);
    return data;
  },
};
