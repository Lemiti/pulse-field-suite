import { useState, useMemo } from 'react';
import type { PhaseResponse, TaskResponse, TaskStatus } from '@pulse/shared-types';
import {
  Calendar,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User,
  Activity,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';

// Re-use or define status configs for consistent styling
const STATUS_CONFIG: Record<
  TaskStatus,
  { bg: string; text: string; border: string; icon: React.ReactNode; label: string; gradient: string }
> = {
  PLAN: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
    icon: <Clock className="w-4 h-4" />,
    label: 'Plan',
    gradient: 'from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-800',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: 'In Progress',
    gradient: 'from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700',
  },
  COMPLETED: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-800',
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: 'Completed',
    gradient: 'from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700',
  },
  ANALYSIS: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Analysis',
    gradient: 'from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700',
  },
};

// Seeded field officers mapping (matching NewTaskModal.tsx)
const FIELD_OFFICERS = [
  { name: 'Ama Boateng', id: '11111111-0000-0000-0000-000000000001' },
  { name: 'Kweku Mensah', id: '11111111-0000-0000-0000-000000000002' },
  { name: 'Abena Owusu', id: '11111111-0000-0000-0000-000000000003' },
  { name: 'Kofi Asante', id: '11111111-0000-0000-0000-000000000004' },
  { name: 'Efua Darko', id: '11111111-0000-0000-0000-000000000005' },
  { name: 'Nana Agyei', id: '11111111-0000-0000-0000-000000000006' },
  { name: 'Yaa Frimpong', id: '11111111-0000-0000-0000-000000000007' },
  { name: 'Kwame Adjei', id: '11111111-0000-0000-0000-000000000008' },
  { name: 'Adwoa Tetteh', id: '11111111-0000-0000-0000-000000000009' },
  { name: 'Kojo Bediako', id: '11111111-0000-0000-0000-000000000010' },
  { name: 'Akua Amponsah', id: '11111111-0000-0000-0000-000000000011' },
  { name: 'Yaw Acheampong', id: '11111111-0000-0000-0000-000000000012' },
];

interface ProjectGanttProps {
  projectId: string;
  tasks: TaskResponse[];
  phases: PhaseResponse[];
  isUpdating: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  readOnly?: boolean;
}

export default function ProjectGantt({
  projectId,
  tasks,
  phases,
  isUpdating,
  onStatusChange,
  readOnly,
}: ProjectGanttProps) {
  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});

  // Parse dates safely
  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Determine Gantt range based on task durations
  const { ganttStart, ganttEnd, totalDays, timelineDays, months } = useMemo(() => {
    const dates = tasks
      .filter((t) => t.start_date && t.end_date)
      .flatMap((t) => [parseDate(t.start_date), parseDate(t.end_date)])
      .filter((d): d is Date => d !== null);

    let start = new Date();
    let end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // Default to 2-week view

    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      // Pad range with 3 days start and 5 days end buffer
      start = new Date(minDate);
      start.setDate(start.getDate() - 3);

      end = new Date(maxDate);
      end.setDate(end.getDate() + 5);
    } else {
      start.setDate(start.getDate() - 3);
    }

    // Standardize to midnight for calculation accuracy
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const days: Date[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    // Determine month boundaries and column spans
    const monthSpans: { label: string; span: number }[] = [];
    let currentMonth = '';
    let currentSpan = 0;

    days.forEach((day, index) => {
      const mName = day.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (mName !== currentMonth) {
        if (currentSpan > 0) {
          monthSpans.push({ label: currentMonth, span: currentSpan });
        }
        currentMonth = mName;
        currentSpan = 1;
      } else {
        currentSpan++;
      }
      if (index === days.length - 1) {
        monthSpans.push({ label: currentMonth, span: currentSpan });
      }
    });

    return {
      ganttStart: start,
      ganttEnd: end,
      totalDays: daysCount,
      timelineDays: days,
      months: monthSpans,
    };
  }, [tasks]);

  // Determine Today's Column Index
  const todayColIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < ganttStart || today > ganttEnd) return null;
    return Math.floor((today.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [ganttStart, ganttEnd]);

  // Group tasks by phase
  const grouped = useMemo(() => {
    const uncategorized: TaskResponse[] = [];
    const byPhase: Record<string, TaskResponse[]> = {};

    phases.forEach((p) => {
      byPhase[p.id] = [];
    });

    tasks.forEach((t) => {
      if (t.phase_id && byPhase[t.phase_id]) {
        byPhase[t.phase_id].push(t);
      } else {
        uncategorized.push(t);
      }
    });

    return { uncategorized, byPhase };
  }, [tasks, phases]);

  const togglePhase = (phaseId: string) => {
    setCollapsedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const getTaskDurationString = (task: TaskResponse) => {
    if (!task.start_date || !task.end_date) return 'Unscheduled';
    const s = new Date(task.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = new Date(task.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${s} – ${e}`;
  };

  const selectedTaskPhaseName = useMemo(() => {
    if (!selectedTask || !selectedTask.phase_id) return 'Uncategorized';
    return phases.find((p) => p.id === selectedTask.phase_id)?.name || 'Uncategorized';
  }, [selectedTask, phases]);

  // Handle status update from within details dialog
  const handleDialogStatusChange = async (status: TaskStatus) => {
    if (!selectedTask) return;
    try {
      await onStatusChange(selectedTask.id, status);
      setSelectedTask((prev) => (prev ? { ...prev, status } : null));
    } catch (err) {
      console.error('Failed to change status in dialog', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* TITLE & INFO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Project Gantt Chart & Timeline
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Visual workspace schedule. Color-coded by progress status. Drag, scroll, and click to inspect details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${config.gradient}`} />
              <span>{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* GANTT SCROLL CONTAINER */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
        {/* VIEW AREA */}
        <div className="flex overflow-x-auto divide-x divide-slate-200 dark:divide-slate-800 relative">
          
          {/* LEFT COLUMN: Sticky Task List */}
          <div className="w-80 shrink-0 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
            {/* Corner header cells */}
            <div className="h-[69px] border-b border-slate-200 dark:border-slate-800 flex items-center px-4 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Work Item / Task Name
              </span>
            </div>

            {/* List Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* UNCATEGORIZED HEADER */}
              {grouped.uncategorized.length > 0 && (
                <div>
                  <button
                    onClick={() => togglePhase('uncategorized')}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-amber-50/50 dark:bg-amber-950/20 text-left font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-200 border-b border-slate-100 dark:border-slate-850"
                  >
                    {collapsedPhases['uncategorized'] ? (
                      <ChevronRight className="w-4 h-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    )}
                    <span>Uncategorized Tasks ({grouped.uncategorized.length})</span>
                  </button>

                  {!collapsedPhases['uncategorized'] &&
                    grouped.uncategorized.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="h-[52px] px-4 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                          {t.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {getTaskDurationString(t)}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* PHASES LIST ROWS */}
              {phases.map((p) => {
                const phaseTasks = grouped.byPhase[p.id] || [];
                const isCollapsed = collapsedPhases[p.id];
                return (
                  <div key={p.id}>
                    <button
                      onClick={() => togglePhase(p.id)}
                      className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/40 text-left font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-350 border-b border-slate-150 dark:border-slate-800"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="truncate flex-1">{p.name} ({phaseTasks.length})</span>
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full shrink-0">
                        Phase
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {phaseTasks.length > 0 ? (
                          phaseTasks.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTask(t)}
                              className="h-[52px] px-4 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                            >
                              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                                {t.name}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                {getTaskDurationString(t)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="h-[52px] px-4 flex items-center text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50/20 dark:bg-slate-900/10">
                            No tasks in phase
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Gantt Timeline Grid */}
          <div className="flex-1 overflow-x-auto relative scroll-smooth hide-scrollbar min-h-[400px]">
            {/* Header dates grids */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 select-none">
              {/* 1. Months Header row */}
              <div
                className="grid border-b border-slate-200 dark:border-slate-800"
                style={{ gridTemplateColumns: `repeat(${totalDays}, 40px)` }}
              >
                {months.map((m, idx) => (
                  <div
                    key={idx}
                    className="text-center py-2 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 select-none"
                    style={{ gridColumn: `span ${m.span}` }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {/* 2. Days Header row */}
              <div
                className="grid border-b border-slate-200 dark:border-slate-800"
                style={{ gridTemplateColumns: `repeat(${totalDays}, 40px)` }}
              >
                {timelineDays.map((day, idx) => (
                  <div
                    key={idx}
                    className="text-center py-1.5 text-xs font-bold text-slate-400 border-r border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-300">
                      {day.getDate()}
                    </span>
                    <span className="text-[8px] uppercase font-semibold text-slate-400">
                      {day.toLocaleString('en-US', { weekday: 'short' }).slice(0, 1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Rows with Grid lines background */}
            <div className="relative divide-y divide-slate-100 dark:divide-slate-850">
              
              {/* Today's indicator line */}
              {todayColIndex !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 dark:bg-red-400 z-10 pointer-events-none"
                  style={{
                    gridColumnStart: todayColIndex,
                  }}
                  title={`Today: ${new Date().toLocaleDateString()}`}
                />
              )}

              {/* UNCATEGORIZED TASKS ROW */}
              {grouped.uncategorized.length > 0 && (
                <div>
                  {/* Collapsible header row spacer */}
                  <div className="h-[41px] bg-amber-50/50 dark:bg-amber-950/20 border-b border-slate-100 dark:border-slate-850" />

                  {!collapsedPhases['uncategorized'] &&
                    grouped.uncategorized.map((t) => {
                      const taskStart = parseDate(t.start_date);
                      const taskEnd = parseDate(t.end_date);
                      const isScheduled = taskStart && taskEnd;

                      let startCol = 1;
                      let spanCol = 1;
                      if (isScheduled) {
                        startCol =
                          Math.floor((taskStart.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)) +
                          1;
                        spanCol =
                          Math.round((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      }

                      return (
                        <div
                          key={t.id}
                          className="h-[52px] relative grid bg-white dark:bg-slate-900"
                          style={{ gridTemplateColumns: `repeat(${totalDays}, 40px)` }}
                        >
                          {/* Grid background lines */}
                          {timelineDays.map((_, i) => (
                            <div key={i} className="border-r border-slate-100 dark:border-slate-800/40 h-full pointer-events-none" />
                          ))}

                          {/* Colored bar */}
                          {isScheduled && (
                            <div
                              onClick={() => setSelectedTask(t)}
                              style={{
                                gridColumn: `${startCol} / span ${spanCol}`,
                              }}
                              className={`h-7 self-center mx-1 rounded-md bg-gradient-to-r ${STATUS_CONFIG[t.status].gradient} shadow-md border ${STATUS_CONFIG[t.status].border} text-white text-[10px] font-bold px-2 flex items-center justify-between cursor-pointer hover:scale-[1.01] hover:shadow-lg transition-all duration-150 overflow-hidden truncate`}
                            >
                              <span className="truncate pr-1">{t.name}</span>
                              <span className="text-[9px] opacity-90 font-mono text-xs hidden sm:block font-normal">
                                {spanCol}d
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* PHASES & TASKS ROWS */}
              {phases.map((p) => {
                const phaseTasks = grouped.byPhase[p.id] || [];
                const isCollapsed = collapsedPhases[p.id];
                return (
                  <div key={p.id}>
                    {/* Collapsible header row spacer */}
                    <div className="h-[41px] bg-slate-50 dark:bg-slate-800/40 border-b border-slate-150 dark:border-slate-800" />

                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {phaseTasks.length > 0 ? (
                          phaseTasks.map((t) => {
                            const taskStart = parseDate(t.start_date);
                            const taskEnd = parseDate(t.end_date);
                            const isScheduled = taskStart && taskEnd;

                            let startCol = 1;
                            let spanCol = 1;
                            if (isScheduled) {
                              startCol =
                                Math.floor(
                                  (taskStart.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)
                                ) + 1;
                              spanCol =
                                Math.round(
                                  (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)
                                ) + 1;
                            }

                            return (
                              <div
                                key={t.id}
                                className="h-[52px] relative grid bg-white dark:bg-slate-900"
                                style={{ gridTemplateColumns: `repeat(${totalDays}, 40px)` }}
                              >
                                {/* Grid background lines */}
                                {timelineDays.map((_, i) => (
                                  <div key={i} className="border-r border-slate-100 dark:border-slate-800/40 h-full pointer-events-none" />
                                ))}

                                {/* Colored bar */}
                                {isScheduled && (
                                  <div
                                    onClick={() => setSelectedTask(t)}
                                    style={{
                                      gridColumn: `${startCol} / span ${spanCol}`,
                                    }}
                                    className={`h-7 self-center mx-1 rounded-md bg-gradient-to-r ${STATUS_CONFIG[t.status].gradient} shadow-md border ${STATUS_CONFIG[t.status].border} text-white text-[10px] font-bold px-2 flex items-center justify-between cursor-pointer hover:scale-[1.01] hover:shadow-lg transition-all duration-150 overflow-hidden truncate`}
                                  >
                                    <span className="truncate pr-1">{t.name}</span>
                                    <span className="text-[9px] opacity-90 font-mono text-xs hidden sm:block font-normal">
                                      {spanCol}d
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div
                            className="h-[52px] relative grid bg-slate-50/10 dark:bg-slate-900/10"
                            style={{ gridTemplateColumns: `repeat(${totalDays}, 40px)` }}
                          >
                            {timelineDays.map((_, i) => (
                              <div key={i} className="border-r border-slate-100 dark:border-slate-800/40 h-full pointer-events-none" />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* TASK DETAILS MODAL DIALOG */}
      <Dialog
        open={selectedTask !== null}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        title="Task Detail Viewer"
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* Title / Description info */}
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                {selectedTask.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Layers className="w-3.5 h-3.5" />
                  {selectedTaskPhaseName}
                </span>
                <span className="text-xs text-slate-400">• ID: {selectedTask.id}</span>
              </div>
            </div>

            {/* Fields detail */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Start Date
                </span>
                <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {selectedTask.start_date || 'N/A'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  End Date
                </span>
                <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {selectedTask.end_date || 'N/A'}
                </span>
              </div>
              <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200/50 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Duration (Calendar Days)
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {selectedTask.start_date && selectedTask.end_date
                    ? `${
                        Math.round(
                          (new Date(selectedTask.end_date).getTime() -
                            new Date(selectedTask.start_date).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + 1
                      } Days`
                    : 'Unscheduled'}
                </span>
              </div>
            </div>

            {/* Status modification */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Workflow Status
              </label>
              <div className="relative">
                <select
                  value={selectedTask.status}
                  disabled={isUpdating || readOnly}
                  onChange={(e) => handleDialogStatusChange(e.target.value as TaskStatus)}
                  className="w-full h-11 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-white rounded-lg border-2 border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer select-none"
                >
                  {Object.keys(STATUS_CONFIG).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_CONFIG[status as TaskStatus].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-6 h-11 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
