import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import { getCurrentUserId, getUserClaims } from '../../lib/auth';
import type {
  TaskResponse,
  GenerateUploadUrlRequest,
  ConfirmUploadRequest,
  UploadUrlResponse,
  ProjectMediaResponse,
  CreateProjectMediaRequest,
} from '@pulse/shared-types';
import { CloudUpload, FileImage, Loader2, Link2, Trash2, ExternalLink, FileText } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/errors';

interface FilesTabProps {
  projectId: string;
}

export default function FilesTab({ projectId }: FilesTabProps) {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const currentUserId = getCurrentUserId();
  const claims = getUserClaims();

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [gdriveUrl, setGdriveUrl] = useState('');

  const { data: tasks = [] } = useQuery<TaskResponse[]>({
    queryKey: ['project-tasks', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });

  const { data: mediaRecords = [], isLoading: loadingMedia } = useQuery<ProjectMediaResponse[]>({
    queryKey: ['project-media', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/media`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });

  const postLinkMutation = useMutation({
    mutationFn: async (payload: CreateProjectMediaRequest) => {
      await api.post(`/projects/${projectId}/media`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-media', projectId] });
      setGdriveUrl('');
      setStatus('Google Drive link attached successfully.');
    },
    onError: (err) => {
      setStatus(getApiErrorMessage(err, 'Failed to submit Google Drive link.'));
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      await api.delete(`/projects/${projectId}/media/${mediaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-media', projectId] });
      setStatus('Attachment deleted successfully.');
    },
    onError: (err) => {
      setStatus(getApiErrorMessage(err, 'Failed to delete attachment.'));
    },
  });

  const taskId = selectedTaskId || tasks[0]?.id || '';

  const uploadFile = useCallback(
    async (file: File) => {
      if (!taskId) {
        setStatus('Create a task first to attach media.');
        return;
      }
      setUploading(true);
      setStatus(null);
      try {
        const urlPayload: GenerateUploadUrlRequest = {
          task_id: taskId,
          mime_type: file.type || 'application/octet-stream',
          file_size: BigInt(file.size),
        };
        const urlRes = await api.post<UploadUrlResponse>('/media/upload-url', {
          ...urlPayload,
          file_size: Number(urlPayload.file_size),
        });
        const { upload_url, file_id } = urlRes.data;

        // MVP mock storage URL — skip PUT (external host is not reachable)
        const isMockUpload = upload_url.includes('mock-gdrive');
        if (!isMockUpload) {
          await fetch(upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });
        }

        const confirmPayload: ConfirmUploadRequest = {
          task_id: taskId,
          file_id,
          web_url: upload_url,
        };
        await api.post('/media/confirm', confirmPayload);

        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-media', projectId] });
        setStatus(`Uploaded ${file.name} successfully.`);
      } catch (e) {
        console.error(e);
        setStatus(getApiErrorMessage(e, 'Upload failed. Please try again.'));
      } finally {
        setUploading(false);
      }
    },
    [taskId, projectId, queryClient]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div className="max-w-3xl space-y-6">
      {tasks.length > 0 ? (
        <div className="max-w-md">
          <label className="text-xs font-bold text-slate-500 uppercase font-sans">
            Link attachment to task
          </label>
          <select
            value={taskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg overflow-hidden border dark:bg-slate-900 dark:border-slate-700 bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-sans"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold font-sans">
          No tasks available in this project yet. Please create a task to associate files.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload File Panel */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-slate-300 dark:border-slate-750 bg-slate-50 dark:bg-slate-900/50'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          ) : (
            <CloudUpload className="w-10 h-10 text-slate-400" />
          )}
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-sans">
              Upload local file
            </p>
            <p className="text-xs text-slate-500 mt-1 font-sans">S3 mock storage bucket</p>
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold font-sans transition-colors">
            <FileImage className="w-3.5 h-3.5" />
            Browse files
            <input
              type="file"
              disabled={!taskId}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
          </label>
        </div>

        {/* Submit Google Drive Link Panel */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const url = gdriveUrl.trim();
            if (!url) return;
            if (!taskId) {
              setStatus('Create a task first to attach media.');
              return;
            }
            postLinkMutation.mutate({
              task_id: taskId,
              gdrive_web_url: url,
            });
          }}
          className="flex flex-col justify-between rounded-2xl border border-slate-205 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-900/50"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Link2 className="w-5 h-5 text-sky-500" />
              <h3 className="text-sm font-bold font-sans">Attach Google Drive link</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Paste the shared link of your Google Docs, sheets, folders or any drive resources.
            </p>
            <input
              type="url"
              required
              disabled={!taskId}
              placeholder="https://drive.google.com/..."
              value={gdriveUrl}
              onChange={(e) => setGdriveUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={postLinkMutation.isPending || !gdriveUrl.trim() || !taskId}
            className="mt-4 px-4 py-2 w-full text-center rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold font-sans disabled:opacity-50 transition-colors cursor-pointer"
          >
            {postLinkMutation.isPending ? 'Linking…' : 'Attach Link'}
          </button>
        </form>
      </div>

      {status && (
        <p
          className={`text-sm font-medium font-sans ${
            status.toLowerCase().includes('fail') || status.includes('error')
              ? 'text-red-500 dark:text-red-405'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {status}
        </p>
      )}

      {/* Attachments List */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-sans border-b border-slate-200 dark:border-slate-800 pb-2">
          Project Attachments ({mediaRecords.length})
        </h3>

        {loadingMedia ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : mediaRecords.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-10 font-sans">
            No files or links attached yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediaRecords.map((record) => {
              const uploaderId = record.uploaded_by;
              const isOwnerOrAdmin = currentUserId === uploaderId || claims?.role === 'ADMIN';
              const isGDrive = !!record.gdrive_web_url;
              const targetUrl = record.gdrive_web_url || '#';
              const createdDate = record.created_at
                ? new Date(record.created_at).toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  })
                : 'Unknown date';

              return (
                <div
                  key={record.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex items-start gap-3 justify-between hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                      {isGDrive ? (
                        <Link2 className="w-5 h-5 text-sky-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate font-sans">
                        {isGDrive ? 'Google Drive Attachment' : 'Proof of Work Upload'}
                      </p>
                      
                      <div className="text-[10px] text-slate-500 space-y-0.5 font-sans">
                        <p className="truncate">
                          <span className="font-semibold">Task:</span> {record.task_name}
                        </p>
                        <p>
                          <span className="font-semibold">By:</span> {record.uploaded_by_name} • {createdDate}
                        </p>
                      </div>

                      {isGDrive && (
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline pt-1"
                        >
                          <span>Open in Drive</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this attachment?')) {
                          deleteMediaMutation.mutate(record.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer shrink-0"
                      title="Delete attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
