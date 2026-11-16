import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Maximize2,
  MessageSquarePlus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assistantService } from '../../services/assistant.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { ChatMessage } from '../../types';

const SUGGESTED_PROMPTS = [
  'What should I study next?',
  'Which prerequisites are incomplete?',
  'How much time did I study this week?',
  'Create a 7-day study plan for me.',
];

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: conversations = [] } = useQuery({
    queryKey: ['assistant-conversations'],
    queryFn: assistantService.listConversations,
    enabled: open,
  });

  const { data: conversationDetail } = useQuery({
    queryKey: ['assistant-conversation', activeConversationId],
    queryFn: () => assistantService.getConversation(activeConversationId!),
    enabled: open && Boolean(activeConversationId),
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      assistantService.chat({ message, conversationId: activeConversationId }),
    onSuccess: (res) => {
      setActiveConversationId(res.conversationId);
      setOptimisticMessages([]);
      queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
      queryClient.invalidateQueries({
        queryKey: ['assistant-conversation', res.conversationId],
      });
    },
    onError: (err) => {
      setOptimisticMessages([]);
      showToast(getApiErrorMessage(err, 'Failed to send message'), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assistantService.deleteConversation(id),
    onSuccess: () => {
      setActiveConversationId(null);
      setOptimisticMessages([]);
      queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
      showToast('Conversation cleared', 'success');
    },
  });

  const messages = conversationDetail?.messages || optimisticMessages;

  const handleSend = (text?: string) => {
    const prompt = (text ?? input).trim();
    if (!prompt || chatMutation.isPending) return;
    if (!text) setInput('');

    setOptimisticMessages((prev) => [
      ...prev,
      {
        id: `pending-${Date.now()}`,
        role: 'user',
        content: prompt,
        sources: [],
        createdAt: new Date().toISOString(),
      },
    ]);
    chatMutation.mutate(prompt);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 px-4 py-3 text-sm font-medium shadow-lg transition-all whitespace-nowrap shrink-0"
          aria-label="Open AI Study Assistant"
        >
          <Bot className="w-4 h-4 shrink-0" />
          <span>Study Assistant</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[420px] h-[560px] max-h-[82vh] rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#273449] px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
              <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                AI Learning Assistant
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveConversationId(null);
                  setOptimisticMessages([]);
                }}
                title="New conversation"
                className="p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </button>
              {activeConversationId && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(activeConversationId)}
                  title="Clear conversation"
                  className="p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/assistant');
                }}
                title="Expand to full workspace"
                className="p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close panel"
                className="p-1.5 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {conversations.length > 0 && (
            <div className="border-b border-[#E2E8F0] dark:border-[#273449] px-4 py-2 bg-[#F8FAFC] dark:bg-[#0B1120]">
              <select
                value={activeConversationId || ''}
                onChange={(e) => {
                  setActiveConversationId(e.target.value || null);
                  setOptimisticMessages([]);
                }}
                className="w-full rounded-md border border-[#E2E8F0] dark:border-[#273449] bg-white dark:bg-[#111827] px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none"
              >
                <option value="">New conversation...</option>
                {conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Ask anything about your goals, prerequisite locks, weekly hours, or request a tailored study plan based on your live records.
                </p>
                <div className="space-y-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="w-full text-left rounded-lg border border-[#E2E8F0] dark:border-[#273449] px-3 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#4F46E5] dark:hover:border-[#818CF8] transition-colors"
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
                    className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#4F46E5] dark:bg-[#818CF8] text-white dark:text-slate-950'
                        : 'bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#273449] text-[#0F172A] dark:text-[#F8FAFC]'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 max-w-[88%] text-[11px] text-[#64748B] dark:text-[#94A3B8] space-y-0.5">
                      <span className="font-medium">Sources:</span>{' '}
                      {msg.sources
                        .slice(0, 3)
                        .map((s) => s.label)
                        .join(' · ')}
                    </div>
                  )}
                </div>
              ))
            )}

            {chatMutation.isPending && (
              <div className="flex items-start">
                <div className="rounded-xl border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3.5 py-2.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Analyzing your study goals and prerequisites...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="border-t border-[#E2E8F0] dark:border-[#273449] p-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your study progress..."
              className="flex-1 rounded-lg border border-[#E2E8F0] dark:border-[#273449] bg-[#F8FAFC] dark:bg-[#0B1120] px-3 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] dark:focus:ring-[#818CF8]"
            />
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending}
              className="inline-flex items-center justify-center rounded-lg bg-[#4F46E5] hover:bg-indigo-700 dark:bg-[#818CF8] dark:hover:bg-indigo-400 text-white dark:text-slate-950 p-2 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
