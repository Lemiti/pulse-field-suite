import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { X } from 'lucide-react';

interface NewTaskModalProps {
  projectId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewTaskModal({ projectId, onClose, onSuccess }: NewTaskModalProps) {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const activeProjectId = projectId || routeProjectId;
  const [name, setName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // POST to backend tasks creation API endpoint
      await api.post('/tasks', {
        project_id: activeProjectId,
        phase_id: null,
        status: 'PLAN',
        name: name.trim(),
        assigned_to: assignedTo || null,
      });

      queryClient.invalidateQueries({ queryKey: ['project-tasks', activeProjectId] });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data || 'Failed to submit entry. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg font-semibold">
              {error}
            </div>
          )}

          {/* TASK NAME */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Entry / Task Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Drill Water Well #25 at Site B"
              className="border border-slate-300 rounded-lg px-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          {/* ASSIGNED TEAM OFFICER */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Assigned Field Officer
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
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
              disabled={isSubmitting || !name.trim()}
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
