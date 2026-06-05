import { useRef, useState } from 'react';
import type { PhaseResponse, TaskResponse, TaskStatus } from '@pulse/shared-types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  Plus,
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
  onMoveToPhase: (taskId: string, phaseId: string | null) => void;
  isUpdating: boolean;
  onCreatePhase: () => void;
  readOnly?: boolean;
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
    byPhase.push({
      phaseId: phase.id,
      phaseName: phase.name,
      tasks: phaseTasks,
    });
  }

  return { uncategorized, byPhase };
}

function TaskCard({
  task,
  onStatusClick,
  isLoading,
  readOnly,
  phases,
  onMoveToPhase,
}: {
  task: TaskResponse;
  onStatusClick: (position: { top: number; left: number }) => void;
  isLoading: boolean;
  readOnly?: boolean;
  phases?: PhaseResponse[];
  onMoveToPhase?: (taskId: string, phaseId: string | null) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const config = STATUS_CONFIG[task.status];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative">
      <h3 className="text-slate-900 dark:text-white font-semibold text-sm line-clamp-2 mb-3">{task.name}</h3>
      <div className="flex items-center justify-between">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            if (!readOnly && buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              onStatusClick({ top: rect.bottom + 8, left: rect.left });
            }
          }}
          disabled={isLoading || readOnly}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${config.bg} ${config.text} disabled:opacity-50`}
        >
          {config.icon}
          {config.label}
          {!readOnly && <ChevronDown className="w-3 h-3 opacity-60" />}
        </button>

        <span className="text-[10px] text-slate-500 font-mono">
          ID: {task.id.substring(0, 8)}
        </span>
      </div>

      {phases && onMoveToPhase && !readOnly && phases.length > 0 && (
        <div className="relative mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <span className="text-xs text-slate-500 font-medium">Unassigned</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-655 text-slate-700 dark:text-slate-250 transition-colors"
            >
              Move to Phase
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>
            
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20 cursor-default" 
                  onClick={() => setIsDropdownOpen(false)} 
                />
                
                <div className="absolute right-0 bottom-full mb-1.5 z-30 w-52 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
                    Select Phase
                  </div>
                  {phases.map((phase) => (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => {
                        onMoveToPhase(task.id, phase.id);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer block"
                    >
                      {phase.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectTaskBoard({
  phases,
  tasks,
  isLoading,
  onStatusClick,
  onMoveToPhase,
  isUpdating,
  onCreatePhase,
  readOnly,
}: ProjectTaskBoardProps) {
  const { uncategorized, byPhase } = groupTasksByPhase(phases, tasks);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0 && phases.length === 0) {
    return (
      <p className="text-center py-12 text-slate-500 dark:text-slate-400">
        No tasks yet. Create your first task to get started.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {uncategorized.length > 0 && (
        <section className="border border-slate-300 dark:border-slate-800 bg-slate-100/10 dark:bg-slate-900/40 rounded-xl p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Untracked / Uncategorized Tasks
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                These tasks are not linked to a project phase. Assign them when phases are created.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              {uncategorized.length}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={onCreatePhase}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-bold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Phase
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uncategorized.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusClick={(pos) => onStatusClick(task.id, pos)}
                isLoading={isUpdating}
                readOnly={readOnly}
                phases={phases}
                onMoveToPhase={onMoveToPhase}
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
            {phaseTasks.length > 0 ? (
              phaseTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusClick={(pos) => onStatusClick(task.id, pos)}
                  isLoading={isUpdating}
                  readOnly={readOnly}
                />
              ))
            ) : (
              <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4 text-sm text-slate-500 dark:text-slate-400">
                No tasks in this phase yet.
              </div>
            )}
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
