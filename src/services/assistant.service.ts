import { api } from './api';
import type {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  LearningDocument,
} from '../types';

export const assistantService = {
  async chat(payload: { message: string; conversationId?: string | null }): Promise<{
    conversationId: string;
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
  }> {
    const { data } = await api.post('/assistant/chat', payload);
    return data;
  },
  async listConversations(): Promise<ConversationSummary[]> {
    const { data } = await api.get<{ conversations: ConversationSummary[] }>(
      '/assistant/conversations'
    );
    return data.conversations;
  },
  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const { data } = await api.get<ConversationDetail>(
      `/assistant/conversations/${conversationId}`
    );
    return data;
  },
  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`/assistant/conversations/${conversationId}`);
  },
  async listDocuments(): Promise<LearningDocument[]> {
    const { data } = await api.get<{ documents: LearningDocument[] }>('/assistant/documents');
    return data.documents;
  },
  async createDocument(payload: {
    title: string;
    content: string;
    goalId?: string | null;
  }): Promise<LearningDocument> {
    const { data } = await api.post<{ document: LearningDocument }>('/assistant/documents', payload);
    return data.document;
  },
  async deleteDocument(docId: string): Promise<void> {
    await api.delete(`/assistant/documents/${docId}`);
  },
};
