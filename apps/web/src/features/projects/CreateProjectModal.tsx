import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { CreateProjectRequest } from '@pulse/shared-types';
import AIPhaseGenerator, { SelectedPhase } from './AIPhaseGenerator';
import { X, Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormState {
  projectName: string;
  description: string;
  budget: string;
  fundingSources: Set<string>;
}

type ModalState = 'form' | 'submitting';

const FUNDING_SOURCE_OPTIONS = [
  'USAID',
  'Gates Foundation',
  'Private Trust',
  'Direct Donor',
];

export default function CreateProjectModal({
  isOpen,
  onClose,
}: CreateProjectModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ============= STATE MANAGEMENT =============
  const [modalState, setModalState] = useState<ModalState>('form');
  const [formState, setFormState] = useState<FormState>({
    projectName: '',
    description: '',
    budget: '',
    fundingSources: new Set(),
  });
  const [selectedPhases, setSelectedPhases] = useState<SelectedPhase[]>([]);
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({});

  // ============= MUTATIONS =============
  const createProjectMutation = useMutation({
    mutationFn: async (payload: CreateProjectRequest) => {
      const res = await api.post('/projects', payload);
      return res.data as { id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setModalState('form');
      resetForm();
      onClose();
      navigate(`/projects/${data.id}`);
    },
    onError: (error: any) => {
      alert(
        error.response?.data?.error || 'Failed to create project. Please try again.'
      );
    },
  });

  // ============= HANDLERS =============
  const resetForm = () => {
    setFormState({
      projectName: '',
      description: '',
      budget: '',
      fundingSources: new Set(),
    });
    setSelectedPhases([]);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormState> = {};

    if (!formState.projectName.trim()) {
      errors.projectName = 'Project name is required';
    }
    if (!formState.budget.trim()) {
      errors.budget = 'Budget is required';
    } else if (
      isNaN(parseFloat(formState.budget)) ||
      parseFloat(formState.budget) <= 0
    ) {
      errors.budget = 'Budget must be a positive number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleToggleFundingSource = (source: string) => {
    const newSources = new Set(formState.fundingSources);
    if (newSources.has(source)) {
      newSources.delete(source);
    } else {
      newSources.add(source);
    }
    setFormState({ ...formState, fundingSources: newSources });
  };

  const handleApplySuggestedPhases = (phases: SelectedPhase[]) => {
    setSelectedPhases(phases);
  };

  const handleCreateProject = () => {
    if (!validateForm()) return;

    if (selectedPhases.length === 0) {
      alert('Please generate and apply AI-suggested phases, or proceed without them.');
      return;
    }

    setModalState('submitting');

    const payload: CreateProjectRequest = {
      name: formState.projectName.trim(),
      description: formState.description.trim() || null,
      budget_allocated: parseFloat(formState.budget),
      funding_sources: Array.from(formState.fundingSources),
    };

    createProjectMutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col relative overflow-hidden">
        {/* HEADER */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create New Project
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {modalState === 'form' && 'Define your project fundamentals and generate AI phases'}
              {modalState === 'submitting' && 'Finalizing your project setup...'}
            </p>
          </div>
          <button
            onClick={() => {
              if (modalState !== 'submitting') {
                resetForm();
                onClose();
              }
            }}
            disabled={modalState === 'submitting'}
            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="overflow-y-auto flex-1 p-6">
          {modalState === 'form' && (
            <div className="space-y-6">
              {/* PROJECT NAME */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formState.projectName}
                  onChange={(e) => {
                    setFormState({ ...formState, projectName: e.target.value });
                    if (formErrors.projectName) {
                      setFormErrors({
                        ...formErrors,
                        projectName: undefined,
                      });
                    }
                  }}
                  placeholder="e.g., Water Systems Initiative 2026"
                  className={`w-full border rounded-lg px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                    formErrors.projectName
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-slate-300'
                  }`}
                />
                {formErrors.projectName && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                    {formErrors.projectName}
                  </p>
                )}
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={formState.description}
                  onChange={(e) =>
                    setFormState({ ...formState, description: e.target.value })
                  }
                  placeholder="Provide context about your project to help our AI generate relevant phases and tasks..."
                  rows={3}
                  className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* BUDGET */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Allocated Budget (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 dark:text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formState.budget}
                    onChange={(e) => {
                      setFormState({ ...formState, budget: e.target.value });
                      if (formErrors.budget) {
                        setFormErrors({ ...formErrors, budget: undefined });
                      }
                    }}
                    placeholder="0.00"
                    className={`w-full border rounded-lg pl-8 pr-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                      formErrors.budget
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-slate-300'
                    }`}
                  />
                </div>
                {formErrors.budget && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                    {formErrors.budget}
                  </p>
                )}
              </div>

              {/* FUNDING SOURCES */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Funding Sources
                </label>
                <div className="space-y-2">
                  {FUNDING_SOURCE_OPTIONS.map((source) => (
                    <label
                      key={source}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={formState.fundingSources.has(source)}
                        onChange={() => handleToggleFundingSource(source)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600 focus:ring-2 cursor-pointer"
                      />
                      <span className="text-slate-700 dark:text-slate-300 text-sm font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {source}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* AI PHASE GENERATOR */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <AIPhaseGenerator
                  projectName={formState.projectName}
                  description={formState.description}
                  onApplySuggestedPhases={handleApplySuggestedPhases}
                />
              </div>

              {/* SELECTED PHASES SUMMARY */}
              {selectedPhases.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-green-900 dark:text-green-200 text-sm font-medium">
                    ✅ {selectedPhases.length} phase{selectedPhases.length !== 1 ? 's' : ''} selected with{' '}
                    {selectedPhases.reduce((acc, p) => acc + p.tasks.length, 0)} task
                    {selectedPhases.reduce((acc, p) => acc + p.tasks.length, 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SUBMITTING STATE */}
          {modalState === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-pulse" />
                <div className="absolute inset-2 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full">
                  <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-center">
                Creating your project and setting up phases...
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between gap-3">
          {modalState === 'form' && (
            <>
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={createProjectMutation.isPending || selectedPhases.length === 0}
                className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${
                  selectedPhases.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              >
                {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </>
          )}

          {modalState === 'submitting' && (
            <div className="w-full flex justify-center">
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                Please wait...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
