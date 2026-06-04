import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import { getCurrentUserId, getUserClaims } from '../../lib/auth';
import type {
  ProjectMessageResponse,
  CreateProjectMessageRequest,
} from '@pulse/shared-types';
import { Send } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/errors';

interface MessagesTabProps {
  projectId: string;
}

function senderMeta(senderId: string, currentUserId: string | null) {
  const claims = getUserClaims();
  if (currentUserId && senderId === currentUserId) {
    return { name: 'You', role: claims?.role ?? 'Member', isSelf: true };
  }
  return {
    name: `Member ${senderId.slice(0, 8)}`,
    role: 'TEAM',
    isSelf: false,
  };
}

export default function MessagesTab({ projectId }: MessagesTabProps) {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const currentUserId = getCurrentUserId();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryKey = ['project-messages', projectId, activeCountryId] as const;

  const { data: messages = [] } = useQuery<ProjectMessageResponse[]>({
    queryKey,
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/messages`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
    refetchInterval: 4000,
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: CreateProjectMessageRequest) => {
      const res = await api.post(`/projects/${projectId}/messages`, payload);
      return res.data as ProjectMessageResponse;
    },
    onMutate: async (payload) => {
      setSendError(null);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectMessageResponse[]>(queryKey) ?? [];
      const optimistic: ProjectMessageResponse = {
        id: `temp-${crypto.randomUUID()}`,
        project_id: projectId,
        sender_id: currentUserId ?? 'pending',
        content: payload.content,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData(queryKey, [...previous, optimistic]);
      return { previous, draftSnapshot: payload.content };
    },
    onSuccess: (saved) => {
      const current = queryClient.getQueryData<ProjectMessageResponse[]>(queryKey) ?? [];
      const withoutTemps = current.filter((m) => !m.id.startsWith('temp-'));
      queryClient.setQueryData(queryKey, [...withoutTemps, saved]);
      setDraft('');
    },
    onError: (err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      if (context?.draftSnapshot) {
        setDraft(context.draftSnapshot);
      }
      setSendError(getApiErrorMessage(err, 'Message could not be saved.'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px] max-w-3xl border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No messages yet. Start the conversation.</p>
        ) : (
          sorted.map((msg) => {
            const { name, role, isSelf } = senderMeta(msg.sender_id, currentUserId);
            const time = new Date(msg.created_at).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                <div className={`mb-1 ${isSelf ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{name}</span>
                  <span className="ml-2 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {role}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    isSelf
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isSelf ? 'text-emerald-100' : 'text-slate-500'}`}>{time}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {sendError && (
        <p className="px-4 py-2 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-900">
          {sendError}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const content = draft.trim();
          if (!content) return;
          sendMutation.mutate({ content });
        }}
        className="flex gap-2 p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0"
      >
        <input
          type="text"
          spellCheck="true"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 px-4 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <button
          type="submit"
          disabled={sendMutation.isPending || !draft.trim()}
          className="p-2.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
