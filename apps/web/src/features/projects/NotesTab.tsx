import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import { getCurrentUserId, getUserClaims } from '../../lib/auth';
import type {
  FieldLogResponse,
  CreateFieldLogRequest,
  UpdateFieldLogRequest,
} from '@pulse/shared-types';
import { Dialog } from '../../components/ui/Dialog';
import { Pencil, Trash2 } from 'lucide-react';

const createNoteSchema = z.object({
  content: z.string().min(1, 'Note cannot be empty').max(10000),
});

const editNoteSchema = createNoteSchema;

type CreateNoteForm = z.infer<typeof createNoteSchema>;

interface NotesTabProps {
  projectId: string;
}

const OFFICER_NAMES: Record<string, string> = {
  '11111111-0000-0000-0000-000000000001': 'Ama Boateng',
  '11111111-0000-0000-0000-000000000002': 'Kweku Mensah',
};

function authorLabel(authorId: string, currentUserId: string | null): { name: string; role: string } {
  const claims = getUserClaims();
  if (currentUserId && authorId === currentUserId) {
    return { name: 'You', role: claims?.role ?? 'Member' };
  }
  return {
    name: OFFICER_NAMES[authorId] ?? `User ${authorId.slice(0, 8)}`,
    role: 'FIELD_OFFICER',
  };
}

function NoteBlock({
  note,
  currentUserId,
  onEdit,
  onDelete,
}: {
  note: FieldLogResponse;
  currentUserId: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { name, role } = authorLabel(note.author_id, currentUserId);
  const created = new Date(note.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const isOwner = currentUserId === note.author_id;

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{name}</p>
          <span className="inline-block mt-0.5 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {role}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <time className="text-xs text-slate-500 dark:text-slate-400 font-medium">{created}</time>
          {note.is_edited && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">(edited)</span>
          )}
          {isOwner && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-500 cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-500 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </header>
      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
        {note.content}
      </p>
    </article>
  );
}

export default function NotesTab({ projectId }: NotesTabProps) {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const currentUserId = getCurrentUserId();
  const [editingNote, setEditingNote] = useState<FieldLogResponse | null>(null);
  const [editContent, setEditContent] = useState('');

  const createMethods = useForm<CreateNoteForm>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: { content: '' },
  });

  const { data: notes = [], isLoading } = useQuery<FieldLogResponse[]>({
    queryKey: ['project-notes', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/notes`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateFieldLogRequest) => {
      const res = await api.post(`/projects/${projectId}/notes`, payload);
      return res.data as FieldLogResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-notes', projectId] });
      createMethods.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ noteId, payload }: { noteId: string; payload: UpdateFieldLogRequest }) => {
      const res = await api.patch(`/projects/${projectId}/notes/${noteId}`, payload);
      return res.data as FieldLogResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-notes', projectId] });
      setEditingNote(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await api.delete(`/projects/${projectId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-notes', projectId] });
    },
  });

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <FormProvider {...createMethods}>
        <form
          onSubmit={createMethods.handleSubmit((data) => {
            createMutation.mutate({ content: data.content });
          })}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3"
        >
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">New field note</h3>
          <div>
            <label htmlFor="content" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Note
            </label>
            <textarea
              id="content"
              spellCheck="true"
              rows={4}
              placeholder="Document field observations…"
              className={`mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 ${
                createMethods.formState.errors.content ? 'border-red-500' : ''
              }`}
              {...createMethods.register('content')}
            />
            {createMethods.formState.errors.content?.message && (
              <span className="text-xs text-red-500 font-medium">
                {String(createMethods.formState.errors.content.message)}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {createMutation.isPending ? 'Posting…' : 'Post note'}
          </button>
        </form>
      </FormProvider>

      {isLoading ? (
        <div className="animate-pulse h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      ) : sortedNotes.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No field notes yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedNotes.map((note) => (
            <NoteBlock
              key={note.id}
              note={note}
              currentUserId={currentUserId}
              onEdit={() => {
                setEditingNote(note);
                setEditContent(note.content);
              }}
              onDelete={() => {
                if (window.confirm('Are you sure you want to delete this note?')) {
                  deleteMutation.mutate(note.id);
                }
              }}
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!editingNote}
        onOpenChange={(open) => !open && setEditingNote(null)}
        title="Edit field note"
      >
        {editingNote && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = editNoteSchema.safeParse({ content: editContent });
              if (!parsed.success) return;
              updateMutation.mutate({
                noteId: editingNote.id,
                payload: { content: parsed.data.content },
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Content</label>
              <textarea
                spellCheck="true"
                required
                rows={6}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full py-2 rounded-lg bg-sky-600 text-white font-bold text-sm disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </Dialog>
    </div>
  );
}
