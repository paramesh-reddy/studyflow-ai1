import { api } from './api';
import type { ProgressOverview, WeeklyProgress } from '../types';

export const progressService = {
  async getOverview(): Promise<ProgressOverview> {
    const { data } = await api.get<ProgressOverview>('/progress/overview');
    return data;
  },
  async getWeekly(): Promise<WeeklyProgress> {
    const { data } = await api.get<WeeklyProgress>('/progress/weekly');
    return data;
  },
};
