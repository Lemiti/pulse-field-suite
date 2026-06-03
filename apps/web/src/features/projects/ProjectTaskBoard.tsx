import { useRef } from 'react';
import type { PhaseResponse, TaskResponse, TaskStatus } from '@pulse/shared-types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
} from 'lucide-react';

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

const NEXT_STATUS: Record<TaskStatus, TaskStatus[]> = {
  PLAN: ['IN_PROGRESS', 'ANALYSIS'],
  IN_PROGRESS: ['COMPLETED', 'ANALYSIS'],
  COMPLETED: ['PLAN'],
  ANALYSIS: ['PLAN', 'IN_PROGRESS'],
};

interface ProjectTaskBoardProps {
  phases: PhaseResponse[];
  tasks: TaskResponse[];
  isLoading: boolean;
  onStatusClick: (taskId: string, position: { top: number; left: number }) => void;
  isUpdating: boolean;
}

export function groupTasksByPhase(phases: PhaseResponse[], tasks: TaskResponse[]) {
  const phaseNameById = new Map(phases.map((p) => [p.id, p.name]));
  const uncategorized: TaskResponse[] = [];
  const byPhase: { phaseId: string; phaseName: string; tasks: TaskResponse[] }[] = [];

  const phaseBuckets = new Map<string, TaskResponse[]>();
  for (const phase of phases) {
    phaseBuckets.set(phase.id, []);
  }

  for (const task of tasks) {
    const pid = task.phase_id;
    if (!pid || !phaseNameById.has(pid)) {
      uncategorized.push(task);
    } else {
      phaseBuckets.get(pid)!.push(task);
    }
  }

  for (const phase of phases) {
    const phaseTasks = phaseBuckets.get(phase.id) ?? [];
    if (phaseTasks.length > 0) {
      byPhase.push({
        phaseId: phase.id,
        phaseName: phase.name,
        tasks: phaseTasks,
      });
    }
  }

  return { uncategorized, byPhase };
}

function TaskCard({
  task,
  onStatusClick,
  isLoading,
}: {
  task: TaskResponse;
  onStatusClick: (position: { top: number; left: number }) => void;
  isLoading: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const config = STATUS_CONFIG[task.status];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-slate-900 dark:text-white font-semibold text-sm line-clamp-2 mb-3">{task.name}</h3>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            onStatusClick({ top: rect.bottom + 8, left: rect.left });
          }
        }}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${config.bg} ${config.text} disabled:opacity-50`}
      >
        {config.icon}
        {config.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500">
        ID: <span className="font-mono">{task.id.substring(0, 8)}</span>
      </p>
    </div>
  );
}

export default function ProjectTaskBoard({
  phases,
  tasks,
  isLoading,
  onStatusClick,
  isUpdating,
}: ProjectTaskBoardProps) {
  const { uncategorized, byPhase } = groupTasksByPhase(phases, tasks);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="text-center py-12 text-slate-500 dark:text-slate-400">
        No tasks yet. Create your first task to get started.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {uncategorized.length > 0 && (
        <section className="border-2 border-amber-300/80 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                Untracked / Uncategorized Tasks
              </h2>
              <p className="text-sm text-amber-800/90 dark:text-amber-200/80 mt-0.5">
                These tasks are not linked to a project phase. Assign them when phases are created.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
              {uncategorized.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uncategorized.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusClick={(pos) => onStatusClick(task.id, pos)}
                isLoading={isUpdating}
              />
            ))}
          </div>
        </section>
      )}

      {byPhase.map(({ phaseId, phaseName, tasks: phaseTasks }) => (
        <section key={phaseId} className="space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{phaseName}</h3>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
              Phase
            </span>
            <span className="text-sm text-slate-500 ml-auto">
              {phaseTasks.length} task{phaseTasks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phaseTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusClick={(pos) => onStatusClick(task.id, pos)}
                isLoading={isUpdating}
              />
            ))}
          </div>
        </section>
      ))}

      {uncategorized.length === 0 && byPhase.length === 0 && (
        <p className="text-sm text-slate-500 text-center">No categorized work items.</p>
      )}
    </div>
  );
}

export { NEXT_STATUS, STATUS_CONFIG };
