import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  AIGenerateRequest,
  AIGenerateResponse,
  AIPhaseSuggestion,
  AITaskSuggestion,
} from '@pulse/shared-types';
import {
  Sparkles,
  Loader2,
  ChevronDown,
  Trash2,
  Plus,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';

// ============= TYPE DEFINITIONS =============
export interface SelectedPhase {
  name: string;
  tasks: SelectedTask[];
}

interface SelectedTask {
  name: string;
  estimated_days: number;
}

interface EditablePhase extends AIPhaseSuggestion {
  id: string;
  tasks: EditableTask[];
}

interface EditableTask extends AITaskSuggestion {
  id: string;
  selected: boolean;
}

type GeneratorState = 'trigger' | 'loading' | 'review' | 'empty';

interface AIPhaseGeneratorProps {
  projectName: string;
  description: string;
  onApplySuggestedPhases: (phases: SelectedPhase[]) => void;
}

// ============= LOADING SKELETON =============
const PhaseSkeletonLoader = () => (
  <div className="space-y-4">
    {[0, 1, 2].map((idx) => (
      <div key={idx} className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4 animate-pulse" />
        <div className="space-y-2">
          {[0, 1, 2].map((taskIdx) => (
            <div
              key={taskIdx}
              className="flex gap-3 items-center"
            >
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-1 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ============= MAIN COMPONENT =============
export default function AIPhaseGenerator({
  projectName,
  description,
  onApplySuggestedPhases,
}: AIPhaseGeneratorProps) {
  // ============= STATE =============
  const [generatorState, setGeneratorState] = useState<GeneratorState>('trigger');
  const [suggestedPhases, setSuggestedPhases] = useState<EditablePhase[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [currentStatusMessage, setCurrentStatusMessage] = useState<string>('');

  // ============= MUTATIONS =============
  const generatePhasesMutation = useMutation({
    mutationFn: async (payload: AIGenerateRequest) => {
      // Show different status messages to simulate thinking process
      const messages = [
        'Analyzing project scope...',
        'Generating optimal phases...',
        'Estimating timelines...',
      ];
      
      for (let i = 0; i < messages.length; i++) {
        setCurrentStatusMessage(messages[i]);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const res = await api.post<AIGenerateResponse>('/ai/suggest-phases', payload);
      return res.data;
    },
    onSuccess: (data) => {
      const editablePhases = data.phases.map((phase, phaseIdx) => ({
        ...phase,
        id: `phase-${phaseIdx}`,
        tasks: phase.tasks.map((task, taskIdx) => ({
          ...task,
          id: `task-${phaseIdx}-${taskIdx}`,
          selected: true,
        })),
      }));

      setSuggestedPhases(editablePhases);
      setExpandedPhases(new Set(editablePhases.map((p) => p.id)));
      setGeneratorState('review');
      setCurrentStatusMessage('');
    },
    onError: () => {
      setGeneratorState('trigger');
      setCurrentStatusMessage('');
      alert('Failed to generate phases. Please try again.');
    },
  });

  // ============= HANDLERS =============
  const handleGeneratePhases = useCallback(() => {
    if (!projectName.trim() || !description.trim()) return;

    setGeneratorState('loading');
    generatePhasesMutation.mutate({
      project_name: projectName.trim(),
      description: description.trim(),
    });
  }, [projectName, description, generatePhasesMutation]);

  const handleTogglePhaseExpansion = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const handleToggleTask = (phaseId: string, taskId: string) => {
    setSuggestedPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              tasks: phase.tasks.map((task) =>
                task.id === taskId ? { ...task, selected: !task.selected } : task
              ),
            }
          : phase
      )
    );
  };

  const handleUpdatePhaseName = (phaseId: string, newName: string) => {
    setSuggestedPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId ? { ...phase, name: newName } : phase
      )
    );
  };

  const handleUpdateTaskName = (phaseId: string, taskId: string, newName: string) => {
    setSuggestedPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              tasks: phase.tasks.map((task) =>
                task.id === taskId ? { ...task, name: newName } : task
              ),
            }
          : phase
      )
    );
  };

  const handleAddCustomTask = (phaseId: string) => {
    setSuggestedPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              tasks: [
                ...phase.tasks,
                {
                  id: `task-custom-${Date.now()}`,
                  name: 'New Custom Task',
                  estimated_days: 5,
                  selected: true,
                },
              ],
            }
          : phase
      )
    );
  };

  const handleRemoveTask = (phaseId: string, taskId: string) => {
    setSuggestedPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              tasks: phase.tasks.filter((task) => task.id !== taskId),
            }
          : phase
      )
    );
  };

  const handleRemovePhase = (phaseId: string) => {
    setSuggestedPhases((prev) =>
      prev.filter((phase) => phase.id !== phaseId)
    );
    setExpandedPhases((prev) => {
      const newExpanded = new Set(prev);
      newExpanded.delete(phaseId);
      return newExpanded;
    });
  };

  const handleApplySelection = () => {
    const selectedPhases: SelectedPhase[] = suggestedPhases
      .filter((phase) => phase.tasks.some((t) => t.selected))
      .map((phase) => ({
        name: phase.name,
        tasks: phase.tasks
          .filter((task) => task.selected)
          .map((task) => ({
            name: task.name,
            estimated_days: task.estimated_days,
          })),
      }));

    if (selectedPhases.length === 0) {
      alert('Please select at least one task to proceed.');
      return;
    }

    onApplySuggestedPhases(selectedPhases);
    setGeneratorState('trigger');
    setSuggestedPhases([]);
    setExpandedPhases(new Set());
  };

  const handleRegenerate = () => {
    setSuggestedPhases([]);
    setExpandedPhases(new Set());
    setGeneratorState('trigger');
    setCurrentStatusMessage('');
  };

  const isProjectFormValid = projectName.trim().length > 0 && description.trim().length > 0;
  const selectedTaskCount = suggestedPhases.reduce(
    (acc, phase) => acc + phase.tasks.filter((t) => t.selected).length,
    0
  );

  // ============= RENDER: TRIGGER STATE =============
  if (generatorState === 'trigger') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              ✨ Generate Project Phases with AI
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Let our Rust-native AI analyze your project and suggest optimal phases with realistic timelines.
            </p>
            <button
              onClick={handleGeneratePhases}
              disabled={!isProjectFormValid || generatePhasesMutation.isPending}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                isProjectFormValid
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
              } ${generatePhasesMutation.isPending ? 'opacity-75' : ''}`}
              title={
                !isProjectFormValid
                  ? 'Please fill in the project name and description first to guide the AI'
                  : ''
              }
            >
              <Sparkles className="w-4 h-4" />
              {generatePhasesMutation.isPending ? 'Generating...' : 'Generate Now'}
            </button>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {!isProjectFormValid && (
          <div className="mt-4 flex gap-2 items-start text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Please fill in the project name and description first to guide the AI analysis.</span>
          </div>
        )}
      </div>
    );
  }

  // ============= RENDER: LOADING STATE =============
  if (generatorState === 'loading') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-pulse" />
            <div className="absolute inset-2 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              Analyzing your project...
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {currentStatusMessage}
            </p>
          </div>
        </div>
        <PhaseSkeletonLoader />
      </div>
    );
  }

  // ============= RENDER: EMPTY STATE =============
  if (generatorState === 'review' && suggestedPhases.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center">
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          No phases were generated. Please try again with more project details.
        </p>
        <button
          onClick={handleRegenerate}
          className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium text-sm flex items-center gap-2 mx-auto"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // ============= RENDER: REVIEW STATE =============
  if (generatorState === 'review') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Review & Customize Phases
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selectedTaskCount} task{selectedTaskCount !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Regenerate phases"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* INFO BOX */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-200">
          <strong>💡 Tip:</strong> Edit names, select/deselect tasks, add custom tasks, or remove unwanted phases.
        </div>

        {/* PHASES LIST */}
        <div className="space-y-3">
          {suggestedPhases.map((phase) => {
            const isExpanded = expandedPhases.has(phase.id);
            const selectedCount = phase.tasks.filter((t) => t.selected).length;

            return (
              <div
                key={phase.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800"
              >
                {/* PHASE HEADER */}
                <button
                  onClick={() => handleTogglePhaseExpansion(phase.id)}
                  className="w-full flex items-center justify-between bg-slate-100 dark:bg-slate-750 hover:bg-slate-150 dark:hover:bg-slate-700 p-4 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) =>
                        handleUpdatePhaseName(phase.id, e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex-shrink-0">
                      {selectedCount}/{phase.tasks.length}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhase(phase.id);
                    }}
                    className="p-1 rounded text-slate-400 dark:text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </button>

                {/* PHASE TASKS */}
                {isExpanded && (
                  <div className="bg-white dark:bg-slate-900 p-4 space-y-3 border-t border-slate-200 dark:border-slate-700">
                    {phase.tasks.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                        No tasks in this phase
                      </p>
                    ) : (
                      phase.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors group"
                        >
                          <input
                            type="checkbox"
                            checked={task.selected}
                            onChange={() =>
                              handleToggleTask(phase.id, task.id)
                            }
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600 focus:ring-2 mt-1 flex-shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={task.name}
                              onChange={(e) =>
                                handleUpdateTaskName(
                                  phase.id,
                                  task.id,
                                  e.target.value
                                )
                              }
                              className="w-full bg-transparent text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Est. {task.estimated_days} days
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveTask(phase.id, task.id)
                            }
                            className="p-1 rounded text-slate-400 dark:text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}

                    {/* ADD CUSTOM TASK BUTTON */}
                    <button
                      onClick={() => handleAddCustomTask(phase.id)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Custom Task
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleRegenerate}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Re-Generate
          </button>
          <button
            onClick={handleApplySelection}
            disabled={selectedTaskCount === 0}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              selectedTaskCount > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            Apply Selection
          </button>
        </div>
      </div>
    );
  }

  return null;
}
