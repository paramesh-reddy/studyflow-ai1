import { api } from './api';
import type { Goal, GoalStatus } from '../types';

export const goalsService = {
  async list(): Promise<Goal[]> {
    const { data } = await api.get<{ goals: Goal[] }>('/goals');
    return data.goals;
  },
  async get(goalId: string): Promise<Goal> {
    const { data } = await api.get<{ goal: Goal }>(`/goals/${goalId}`);
    return data.goal;
  },
  async create(payload: {
    title: string;
    description?: string;
    category?: string;
    targetDate?: string | null;
    status?: GoalStatus;
  }): Promise<Goal> {
    const { data } = await api.post<{ goal: Goal }>('/goals', payload);
    return data.goal;
  },
  async update(
    goalId: string,
    payload: {
      title?: string;
      description?: string;
      category?: string;
      targetDate?: string | null;
      status?: GoalStatus;
    }
  ): Promise<Goal> {
    const { data } = await api.put<{ goal: Goal }>(`/goals/${goalId}`, payload);
    return data.goal;
  },
  async remove(goalId: string): Promise<void> {
    await api.delete(`/goals/${goalId}`);
  },
};
