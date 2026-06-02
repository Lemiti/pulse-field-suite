import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import PlaceholderPage from '../placeholder/PlaceholderPage';
import NewTaskModal from './NewTaskModal';
import {
  ProjectResponse,
  TaskResponse,
  TaskStatus,
  UpdateTaskStatusRequest,
} from '@pulse/shared-types';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
} from 'lucide-react';

// Status badge styling
const STATUS_CONFIG: Record<
  TaskStatus,
  { bg: string; text: string; icon: React.ReactNode; label: string }
> = {
  PLAN: {
    bg: 'bg-slate-100 dark:bg-slate-700',
    text: 'text-slate-700 dark:text-slate-300',
    icon: <Clock className="w-4 h-4" />,
    label: 'Plan',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-300',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: 'In Progress',
  },
  COMPLETED: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-700 dark:text-green-300',
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: 'Completed',
  },
  ANALYSIS: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Analysis',
  },
};

// Status transition options
const NEXT_STATUS: Record<TaskStatus, TaskStatus[]> = {
  PLAN: ['IN_PROGRESS', 'ANALYSIS'],
  IN_PROGRESS: ['COMPLETED', 'ANALYSIS'],
  COMPLETED: ['PLAN'],
  ANALYSIS: ['PLAN', 'IN_PROGRESS'],
};

export default function ProjectDashboard() {
  const { projectId, tab } = useParams<{ projectId: string; tab?: string }>();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const {
    data: tasksData,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery<TaskResponse[]>({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`);
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
      await queryClient.cancelQueries({ queryKey: ['project-tasks', projectId] });
      const previous = queryClient.getQueryData<TaskResponse[] | undefined>(['project-tasks', projectId]);

      if (previous) {
        queryClient.setQueryData(['project-tasks', projectId], previous.map((t) => (t.id === taskId ? { ...t, status } : t)));
      }

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      setActiveStatusPopover(null);
    },
    onError: (error: any, _variables, context: any) => {
      // Surface the server error to the console and show a readable message to the user
      console.error('Failed to update task status', error);
      const serverMsg = error?.response?.data || error?.message || 'Failed to update task status. Please try again.';
      alert(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));

      // Rollback optimistic update if we have previous data
      if (context?.previous) {
        queryClient.setQueryData(['project-tasks', projectId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
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

  // ============= DATA PROCESSING =============
  const tasks = Array.isArray(tasksData) ? tasksData : [];

  // Separate uncategorized tasks (phase_id is null, undefined, or empty string)
  const uncategorizedTasks = tasks.filter(task => {
    const phaseId = task.phase_id || task.phase_id;
    return !phaseId;
  });

  // Group categorized tasks by phase_id
// Group categorized tasks by phase_id (handling both snake_case and camelCase safely)
  const groupedByPhase = tasks
    .filter((task) => {
      const phaseId = task.phase_id || task.phase_id; // <-- Safe casing check
      return phaseId && phaseId.trim() !== '';
    })
    .reduce(
      (acc, task) => {
        const phaseId = (task.phase_id || task.phase_id)!; // <-- Safe key reference
        if (!acc[phaseId]) {
          acc[phaseId] = [];
        }
        acc[phaseId].push(task);
        return acc;
      },
      {} as Record<string, TaskResponse[]>
    );

  // If we are on a secondary tab, render the placeholder
  if (tab) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col mb-4">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {project?.name || 'Project'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {project?.description}
          </p>
        </div>

        <PlaceholderPage
          title={tab.charAt(0).toUpperCase() + tab.slice(1)}
        />
      </div>
    );
  }

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

      {/* DASHBOARD CONTENT */}
      <div className="space-y-6">
        {projectLoading || tasksLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* UNCATEGORIZED TASKS SECTION */}
            {uncategorizedTasks.length > 0 && (
              <div className="border-2 border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                  <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200">
                    Uncategorized Tasks (Phase Bypass)
                  </h2>
                  <span className="ml-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-200/50 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200">
                    {uncategorizedTasks.length}
                  </span>
                </div>
                <p className="text-amber-800 dark:text-amber-300 text-sm mb-4 font-medium">
                  These tasks have not been assigned to a project phase. Please
                  review and assign them to structured phases.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uncategorizedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusClick={(position) =>
                        setActiveStatusPopover({ taskId: task.id, position })
                      }
                      isLoading={updateTaskStatusMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* STRUCTURED PHASES SECTION */}
            {Object.keys(groupedByPhase).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedByPhase).map(([phaseId, phaseTasks]) => (
                  <div key={phaseId}>
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {phaseId}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {phaseTasks.length} task
                        {phaseTasks.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {phaseTasks.length === 0 ? (
                      <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        No tasks assigned to this phase yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {phaseTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onStatusClick={(position) =>
                              setActiveStatusPopover({
                                taskId: task.id,
                                position,
                              })
                            }
                            isLoading={updateTaskStatusMutation.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : uncategorizedTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">
                  No tasks yet. Create your first task to get started.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>

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
    </div>
  );
}

// ============= TASK CARD COMPONENT =============
interface TaskCardProps {
  task: TaskResponse;
  onStatusClick: (position: { top: number; left: number }) => void;
  isLoading: boolean;
}

function TaskCard({ task, onStatusClick, isLoading }: TaskCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleStatusClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      onStatusClick({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  };

  const config = STATUS_CONFIG[task.status];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm line-clamp-2 flex-1">
          {task.name}
        </h3>
      </div>

      {/* STATUS BADGE / BUTTON */}
      <button
        ref={buttonRef}
        onClick={handleStatusClick}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer hover:opacity-80 disabled:opacity-50 ${config.bg} ${config.text}`}
        aria-label={`Change task status from ${config.label}`}
      >
        {config.icon}
        {config.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {/* METADATA */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ID: <span className="font-mono">{task.id.substring(0, 8)}</span>
        </p>
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
