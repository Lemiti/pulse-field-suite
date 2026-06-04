import { useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import NewTaskModal from './NewTaskModal';
import BudgetStatusBar from './BudgetStatusBar';
import NotesTab from './NotesTab';
import MessagesTab from './MessagesTab';
import ImpactTab from '../impact/ImpactTab';
import FilesTab from '../impact/FilesTab';
import PlaceholderPage from '../placeholder/PlaceholderPage';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import {
  PhaseResponse,
  CreatePhaseRequest,
  ProjectResponse,
  TaskResponse,
  TaskStatus,
  UpdateTaskStatusRequest,
} from '@pulse/shared-types';
import ProjectTaskBoard, { NEXT_STATUS, STATUS_CONFIG } from './ProjectTaskBoard';
import { Loader2, X } from 'lucide-react';

const createPhaseSchema = z.object({
  name: z.string().trim().min(1, 'Phase name is required').max(255, 'Phase name is too long'),
});

type CreatePhaseForm = z.infer<typeof createPhaseSchema>;

export default function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'Dashboard';
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatePhaseModalOpen, setIsCreatePhaseModalOpen] = useState(false);
  const [activeStatusPopover, setActiveStatusPopover] = useState<{
    taskId: string;
    position: { top: number; left: number };
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // ============= QUERIES =============
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery<ProjectResponse>({
    queryKey: ['project', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const phasesQueryKey = ['project-phases', projectId, activeCountryId];

  const {
    data: tasksData,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery<TaskResponse[]>({
    queryKey: ['project-tasks', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });

  const { data: phasesData = [], isLoading: phasesLoading } = useQuery<PhaseResponse[]>({
    queryKey: phasesQueryKey,
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/phases`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });

  // ============= MUTATIONS =============
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => {
      const payload: UpdateTaskStatusRequest = { status };
      const res = await api.patch(`/tasks/${taskId}/status`, payload);
      return res.data;
    },
    // Optimistic update: apply change locally immediately
    onMutate: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const tasksKey = ['project-tasks', projectId, activeCountryId];
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previous = queryClient.getQueryData<TaskResponse[] | undefined>(tasksKey);

      if (previous) {
        queryClient.setQueryData(tasksKey, previous.map((t) => (t.id === taskId ? { ...t, status } : t)));
      }

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['projects', activeCountryId] });
      setActiveStatusPopover(null);
    },
    onError: (error: unknown, _variables, context: { previous?: TaskResponse[] } | undefined) => {
      if (axios.isCancel(error)) return;
      console.error('Failed to update task status', error);
      const err = error as { response?: { data?: unknown }; message?: string };
      const serverMsg = err?.response?.data || err?.message || 'Failed to update task status. Please try again.';
      alert(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));

      // Rollback optimistic update if we have previous data
      if (context?.previous) {
        queryClient.setQueryData(['project-tasks', projectId, activeCountryId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['projects', activeCountryId] });
    },
  });

  const createPhaseMutation = useMutation({
    mutationFn: async (payload: CreatePhaseRequest) => {
      const res = await api.post(`/projects/${payload.project_id}/phases`, payload);
      return res.data as PhaseResponse;
    },
    onSuccess: (phase) => {
      queryClient.setQueryData<PhaseResponse[]>(phasesQueryKey, (current = []) => {
        if (current.some((existingPhase) => existingPhase.id === phase.id)) {
          return current;
        }

        return [...current, phase].sort((a, b) => a.sort_order - b.sort_order);
      });
      queryClient.invalidateQueries({ queryKey: phasesQueryKey });
      setIsCreatePhaseModalOpen(false);
      createPhaseMutation.reset();
    },
  });

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTaskStatusMutation.mutateAsync({ taskId, status });
      // On success, invalidate is handled by onSuccess
    } catch (e) {
      // mutateAsync already bubbles the error to onError; additional handling can go here if needed
      console.debug('handleStatusChange caught error', e);
    }
  };

  const tasks = Array.isArray(tasksData) ? tasksData : [];
  const phases = Array.isArray(phasesData) ? phasesData : [];

  const renderTabContent = () => {
    if (!projectId) return null;
    switch (currentTab) {
      case 'Calendar':
        return <PlaceholderPage title="Calendar" />;
      case 'Messages':
        return <MessagesTab projectId={projectId} />;
      case 'Note':
        return <NotesTab projectId={projectId} />;
      case 'Files':
        return <FilesTab projectId={projectId} />;
      case 'Impact':
        return <ImpactTab projectId={projectId} />;
      case 'Dashboard':
      default:
        return null;
    }
  };

  const tabPanel = renderTabContent();

  if (projectError) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-700 dark:text-red-300 font-medium">
            Failed to load project. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (tabPanel) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
        <div className="flex flex-col">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {project?.name || 'Project'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{project?.description}</p>
        </div>
        {tabPanel}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in font-sans select-none">
      {/* HEADER SECTION */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {project?.name || 'Project'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {project?.description ||
              'Project management dashboard and task tracking.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0"
        >
          New Entry
        </button>
      </div>

      {projectId && (
        <BudgetStatusBar projectId={projectId} />
      )}

      <ProjectTaskBoard
        phases={phases}
        tasks={tasks}
        isLoading={projectLoading || tasksLoading || phasesLoading}
        isUpdating={updateTaskStatusMutation.isPending}
        onStatusClick={(taskId, position) => setActiveStatusPopover({ taskId, position })}
        onCreatePhase={() => {
          createPhaseMutation.reset();
          setIsCreatePhaseModalOpen(true);
        }}
      />

      {/* STATUS TRANSITION POPOVER */}
      {activeStatusPopover && (
        <StatusTransitionPopover
          taskId={activeStatusPopover.taskId}
          position={activeStatusPopover.position}
          task={tasks.find((t) => t.id === activeStatusPopover.taskId)!}
          onStatusSelect={(status) => handleStatusChange(activeStatusPopover.taskId, status)}
          onClose={() => setActiveStatusPopover(null)}
          popoverRef={popoverRef} //fixes the popover not closing when clicking on the same status button again
        />
      )}

      {/* NEW ENTRY MODAL */}
      {isModalOpen && (
        <NewTaskModal
          projectId={projectId!}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            refetchTasks();
          }}
        />
      )}

      {/* CREATE PHASE MODAL */}
      {isCreatePhaseModalOpen && projectId && (
        <CreatePhaseModal
          projectId={projectId}
          isSubmitting={createPhaseMutation.isPending}
          error={createPhaseMutation.error}
          onClose={() => {
            createPhaseMutation.reset();
            setIsCreatePhaseModalOpen(false);
          }}
          onSubmit={(payload) => createPhaseMutation.mutate(payload)}
        />
      )}
    </div>
  );
}

interface CreatePhaseModalProps {
  projectId: string;
  isSubmitting: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (payload: CreatePhaseRequest) => void;
}

function CreatePhaseModal({
  projectId,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: CreatePhaseModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreatePhaseForm>({
    resolver: zodResolver(createPhaseSchema),
    mode: 'onChange',
    defaultValues: { name: '' },
  });

  const serverError = error
    ? ((error as { response?: { data?: unknown }; message?: string }).response?.data ||
        (error as { message?: string }).message ||
        'Failed to create phase. Please try again.')
    : null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create Phase
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Add a phase to organize untracked tasks.
          </p>
        </div>

        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              project_id: projectId,
              name: values.name.trim(),
              sort_order: 0,
            })
          )}
          className="space-y-5"
        >
          {serverError && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-sm p-3 rounded-lg font-semibold">
              {typeof serverError === 'string' ? serverError : JSON.stringify(serverError)}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Phase Name
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g., Site Preparation"
              className={`border rounded-lg px-4 py-3 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                errors.name ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.name?.message && (
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-all shadow-md text-sm"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Phase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============= STATUS TRANSITION POPOVER =============
interface StatusTransitionPopoverProps {
  taskId: string;
  position: { top: number; left: number };
  task: TaskResponse;
  onStatusSelect: (status: TaskStatus) => void;
  onClose: () => void;
  popoverRef: React.RefObject<HTMLDivElement | null>;
}

function StatusTransitionPopover({
  taskId,
  position,
  task,
  onStatusSelect,
  onClose,
  popoverRef,
}: StatusTransitionPopoverProps) {
  const nextStatuses = NEXT_STATUS[task.status];

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-label="Close menu"
      />

      {/* POPOVER */}
      <div
        ref={popoverRef}
        className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-3 min-w-max"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 px-2">
          Change Status
        </p>

        <div className="space-y-1">
          {nextStatuses.map((status) => {
            const config = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                onClick={() => onStatusSelect(status)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-700 ${config.text}`}
              >
                {config.icon}
                {config.label}
              </button>
            );
          })}
        </div>

        {nextStatuses.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 px-2 py-2">
            No status transitions available
          </p>
        )}
      </div>
    </>
  );
}
