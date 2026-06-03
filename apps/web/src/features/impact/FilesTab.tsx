import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import type {
  TaskResponse,
  GenerateUploadUrlRequest,
  ConfirmUploadRequest,
  UploadUrlResponse,
} from '@pulse/shared-types';
import { CloudUpload, FileImage, Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/errors';

interface FilesTabProps {
  projectId: string;
}

export default function FilesTab({ projectId }: FilesTabProps) {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const { data: tasks = [] } = useQuery<TaskResponse[]>({
    queryKey: ['project-tasks', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
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
    <div className="max-w-2xl space-y-4">
      {tasks.length > 0 && (
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Link to task</label>
          <select
            value={taskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border dark:bg-slate-900 dark:border-slate-700"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-colors ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'
        }`}
      >
        {uploading ? (
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        ) : (
          <CloudUpload className="w-10 h-10 text-slate-400" />
        )}
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Drag & drop proof-of-work files
          </p>
          <p className="text-xs text-slate-500 mt-1">Images or documents → S3 resumable upload</p>
        </div>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold">
          <FileImage className="w-4 h-4" />
          Browse files
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
        </label>
      </div>

      {status && (
        <p
          className={`text-sm font-medium ${
            status.toLowerCase().includes('fail') || status.includes('error')
              ? 'text-red-500 dark:text-red-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
