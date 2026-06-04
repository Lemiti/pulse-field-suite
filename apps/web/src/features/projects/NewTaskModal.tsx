import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import type { CreateTaskRequest } from '@pulse/shared-types';
import { X } from 'lucide-react';

interface NewTaskModalProps {
  projectId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const isValidDateInputValue = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const createTaskSchema = z
  .object({
    name: z.string().trim().min(1, 'Task name is required'),
    assignedTo: z.string(),
    start_date: z
      .string()
      .min(1, 'Start date is required')
      .refine((value) => !value || isValidDateInputValue(value), 'Start date is invalid'),
    end_date: z
      .string()
      .min(1, 'End date is required')
      .refine((value) => !value || isValidDateInputValue(value), 'End date is invalid'),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  });

type CreateTaskForm = z.infer<typeof createTaskSchema>;

export default function NewTaskModal({ projectId, onClose, onSuccess }: NewTaskModalProps) {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const activeProjectId = projectId || routeProjectId;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      assignedTo: '',
      start_date: '',
      end_date: '',
    },
  });

  // Seeded list of the 12 active field officers (matches the database seed UUIDs!)
  const fieldOfficers = [
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

  const onSubmit = async (values: CreateTaskForm) => {
    try {
      if (!activeProjectId) {
        setError('root', { message: 'Project is required before creating a task.' });
        return;
      }

      const payload: CreateTaskRequest = {
        project_id: activeProjectId,
        phase_id: null,
        name: values.name.trim(),
        start_date: values.start_date,
        end_date: values.end_date,
      };

      // POST to backend tasks creation API endpoint
      await api.post('/tasks', {
        ...payload,
        assigned_to: values.assignedTo || null,
      });

      queryClient.invalidateQueries({ queryKey: ['project-tasks', activeProjectId] });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      setError('root', {
        message: e.response?.data || 'Failed to submit entry. Please try again.',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MODAL HEADER */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Create Field Entry</h2>
          <p className="text-slate-500 text-sm mt-1">Log a new task or structural initiative directly to the field project logs.</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {errors.root?.message && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg font-semibold">
              {errors.root.message}
            </div>
          )}

          {/* TASK NAME */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Entry / Task Name
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g., Drill Water Well #25 at Site B"
              className={`border rounded-lg px-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                errors.name ? 'border-red-400' : 'border-slate-300'
              }`}
            />
            {errors.name?.message && (
              <span className="text-xs font-semibold text-red-600">{errors.name.message}</span>
            )}
          </div>

          {/* TASK DURATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                {...register('start_date')}
                className={`border rounded-lg px-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                  errors.start_date ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {errors.start_date?.message && (
                <span className="text-xs font-semibold text-red-600">{errors.start_date.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                End Date
              </label>
              <input
                type="date"
                {...register('end_date')}
                className={`border rounded-lg px-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                  errors.end_date ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {errors.end_date?.message && (
                <span className="text-xs font-semibold text-red-600">{errors.end_date.message}</span>
              )}
            </div>
          </div>

          {/* ASSIGNED TEAM OFFICER */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Assigned Field Officer
            </label>
            <select
              {...register('assignedTo')}
              className="border border-slate-300 rounded-lg px-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all bg-white"
            >
              <option value="">Unassigned (None)</option>
              {fieldOfficers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.name}
                </option>
              ))}
            </select>
          </div>

          {/* BUTTON ACTIONS */}
          <div className="flex items-center justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-all shadow-md text-sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Entry'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
