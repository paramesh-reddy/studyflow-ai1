import { api } from './api';
import type { Topic } from '../types';

export const topicsService = {
  async listByGoal(goalId: string): Promise<Topic[]> {
    const { data } = await api.get<{ topics: Topic[] }>(`/goals/${goalId}/topics`);
    return data.topics;
  },
  async create(
    goalId: string,
    payload: {
      title: string;
      description?: string;
      estimatedMinutes?: number;
      prerequisiteIds?: string[];
    }
  ): Promise<Topic> {
    const { data } = await api.post<{ topic: Topic }>(`/goals/${goalId}/topics`, payload);
    return data.topic;
  },
  async update(
    topicId: string,
    payload: {
      title?: string;
      description?: string;
      estimatedMinutes?: number;
      prerequisiteIds?: string[];
    }
  ): Promise<Topic> {
    const { data } = await api.put<{ topic: Topic }>(`/topics/${topicId}`, payload);
    return data.topic;
  },
  async remove(topicId: string): Promise<void> {
    await api.delete(`/topics/${topicId}`);
  },
  async complete(topicId: string): Promise<Topic[]> {
    const { data } = await api.post<{ topics: Topic[] }>(`/topics/${topicId}/complete`);
    return data.topics;
  },
  async reopen(topicId: string): Promise<Topic[]> {
    const { data } = await api.post<{ topics: Topic[] }>(`/topics/${topicId}/reopen`);
    return data.topics;
  },
};
