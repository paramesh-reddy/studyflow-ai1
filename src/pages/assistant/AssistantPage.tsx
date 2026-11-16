import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  FileText,
  MessageSquarePlus,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { assistantService } from '../../services/assistant.service';
import { goalsService } from '../../services/goals.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { ChatMessage } from '../../types';

const SUGGESTED_PROMPTS = [
  'What should I study next?',
  'Why are some of my topics still locked?',
  'How much time did I study this week?',
  'Summarize my learning progress across all goals.',
  'Create a structured 7-day study plan for me.',
  'Which topics am I struggling with based on my notes?',
];

export function AssistantPage() {
  const [tab, setTab] = useState<'chat' | 'documents'>('chat');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);

  const [docTitle, setDocTitle] = useState('');
  const [docGoalId, setDocGoalId] = useState('');
  const [docContent, setDocContent] = useState('');

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: conversations = [] } = useQuery({
    queryKey: ['assistant-conversations'],
    queryFn: assistantService.listConversations,
  });

  const { data: conversationDetail } = useQuery({
    queryKey: ['assistant-conversation', activeConvId],
    queryFn: () => assistantService.getConversation(activeConvId!),
    enabled: Boolean(activeConvId),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['assistant-documents'],
    queryFn: assistantService.listDocuments,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsService.list,
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      assistantService.chat({ message, conversationId: activeConvId }),
    onSuccess: (res) => {
      setActiveConvId(res.conversationId);
      setPendingMessages([]);
      queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
      queryClient.invalidateQueries({
        queryKey: ['assistant-conversation', res.conversationId],
      });
    },
    onError: (err) => {
      setPendingMessages([]);
      showToast(getApiErrorMessage(err), 'error');
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: (id: string) => assistantService.deleteConversation(id),
    onSuccess: () => {
      setActiveConvId(null);
      setPendingMessages([]);
      queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
      showToast('Conversation deleted', 'success');
    },
  });

  const createDocMutation = useMutation({
    mutationFn: assistantService.createDocument,
    onSuccess: () => {
      setDocTitle('');
      setDocGoalId('');
      setDocContent('');
      queryClient.invalidateQueries({ queryKey: ['assistant-documents'] });
      showToast('Learning note indexed for AI retrieval', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: assistantService.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-documents'] });
      showToast('Document removed', 'success');
    },
  });

  const messages = conversationDetail?.messages || pendingMessages;

  const handleSend = (promptText?: string) => {
    const msg = (promptText ?? input).trim();
    if (!msg || chatMutation.isPending) return;
    if (!promptText) setInput('');
    setPendingMessages((prev) => [
      ...prev,
      {
        id: `pending-${Date.now()}`,
        role: 'user',
        content: msg,
        sources: [],
        createdAt: new Date().toISOString(),
      },
    ]);
    chatMutation.mutate(msg);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            AI Learning Assistant
          </h1>
          <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Grounded strictly in your study goals, prerequisite states, session notes, and uploaded study materials.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/70 self-start">
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'chat'
                ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] shadow-sm'
                : 'text-[#64748B] dark:text-[#94A3B8]'
            }`}
          >
            Assistant Chat
          </button>
          <button
            type="button"
            onClick={() => setTab('documents')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'documents'
                ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] shadow-sm'
                : 'text-[#64748B] dark:text-[#94A3B8]'
            }`}
          >
            Study Notes ({documents.length})
          </button>
        </div>
      </div>

      {tab === 'chat' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 h-[calc(100vh-14rem)] min-h-[540px]">
          {/* Conversation History Sidebar */}
          <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[#E2E8F0] dark:border-[#273449]">
              <button
                type="button"
                onClick={() => {
                  setActiveConvId(null);
                  setPendingMessages([]);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 px-3 py-2 text-xs font-medium transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" />
                New Conversation
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-[#273449]">
              {conversations.length === 0 ? (
                <p className="p-4 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Your conversation history will appear here.
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                      activeConvId === conv.id
                        ? 'bg-[#4F46E5]/10 dark:bg-[#818CF8]/15'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setPendingMessages([]);
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="truncate text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                        {conv.title}
                      </p>
                      <p className="text-[11px] tabular-nums text-[#64748B] dark:text-[#94A3B8]">
                        {conv.messageCount} messages
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteConvMutation.mutate(conv.id)}
                      className="p-1 text-[#64748B] dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-400"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Pane */}
          <div className="lg:col-span-3 rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {messages.length === 0 ? (
                <div className="max-w-xl mx-auto py-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#4F46E5]/10 dark:bg-[#818CF8]/15 text-[#4F46E5] dark:text-[#818CF8]">
                      <Bot className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      Ask your StudyFlow AI Coach
                    </h2>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      Answers are computed dynamically from your prerequisite graph, study logs, and notes.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="text-left rounded-lg border border-[#E2E8F0] dark:border-[#273449] p-3 text-xs text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#4F46E5] dark:hover:border-[#818CF8] transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-[#4F46E5] dark:bg-[#818CF8] text-white dark:text-slate-950'
                          : 'bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#273449] text-[#0F172A] dark:text-[#F8FAFC]'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 max-w-[85%] rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-xs text-[#64748B] dark:text-[#94A3B8] space-y-1">
                        <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                          Retrieved Sources
                        </p>
                        {msg.sources.slice(0, 4).map((src, idx) => (
                          <p key={idx} className="truncate">
                            <span className="font-medium">{src.label}:</span> {src.detail}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              {chatMutation.isPending && (
                <div className="flex items-start">
                  <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-4 py-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Retrieving your study data and composing response...
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="border-t border-[#E2E8F0] dark:border-[#273449] p-4 flex items-center gap-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask what to study next, why a topic is locked, or request a 7-day plan..."
                className="flex-1 rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
              />
              <button
                type="submit"
                disabled={!input.trim() || chatMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Add Learning Document
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Index personal summaries, syllabus excerpts, or revision guides for RAG semantic retrieval.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Document Title
                </label>
                <input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g., FastAPI Dependency Injection Notes"
                  className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Related Goal (optional)
                </label>
                <select
                  value={docGoalId}
                  onChange={(e) => setDocGoalId(e.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-sm"
                >
                  <option value="">General study notes</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Content
                </label>
                <textarea
                  rows={5}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Paste study notes, formulas, or key takeaways..."
                  className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={createDocMutation.isPending || docTitle.trim().length < 2 || docContent.trim().length < 10}
                onClick={() =>
                  createDocMutation.mutate({
                    title: docTitle,
                    content: docContent,
                    goalId: docGoalId || null,
                  })
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {createDocMutation.isPending ? 'Indexing...' : 'Index Document'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] divide-y divide-[#E2E8F0] dark:divide-[#273449]">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
                No learning documents indexed yet.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8] shrink-0" />
                      <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                        {doc.title}
                      </h3>
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {doc.goalTitle || 'General'} · {doc.chunkCount} indexed chunk(s)
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-3 mt-1">
                      {doc.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteDocMutation.mutate(doc.id)}
                    className="p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-400"
                    aria-label={`Delete ${doc.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
