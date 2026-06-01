import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import TabEngine from '../..//layout/TabEngine';
import PlaceholderPage from '../placeholder/PlaceholderPage';
import NewTaskModal from './NewTaskModal';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface ProjectDetails {
  id: string;
  name: string;
  description: string | null;
  budget_allocated: number;
  budget_spent: number;
}

interface ProjectStats {
  wells_completed: number;
  active_teams: number;
  budget_spent_percent: number;
}

interface Alert {
  id: string;
  message: string;
  severity: string;
}

export default function ProjectDashboard() {
  const { projectId, tab } = useParams<{ projectId: string; tab?: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch project basic details
  const { data: project } = useQuery<ProjectDetails>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });

  // Fetch project calculated metrics
  const { data: stats, refetch: refetchStats } = useQuery<ProjectStats>({
    queryKey: ['project-stats', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/stats`);
      return res.data;
    },
    enabled: !!projectId,
  });

  // Fetch critical alerts
  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ['project-alerts', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/alerts`);
      return res.data;
    },
    enabled: !!projectId,
  });

  // If we are on a secondary tab, render the placeholder
  if (tab) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Title */}
        <div className="flex flex-col mb-4">
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            {project?.name || 'Project'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {project?.description}
          </p>
        </div>

        <TabEngine />
        <PlaceholderPage title={tab.charAt(0).toUpperCase() + tab.slice(1)} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in font-sans select-none">
      {/* HEADER SECTION */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            {project?.name || 'Project'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {project?.description || 'Water purification initiative tracking dashboard.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0052cc] hover:bg-blue-800 text-white font-extrabold text-sm px-6 py-3 rounded-lg shadow-md transition-all duration-200"
        >
          New Entry
        </button>
      </div>

      {/* DYNAMIC NAVIGATION TABS */}
      <TabEngine />

      {/* DASHBOARD GRID CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PROGRESS METRICS CARD */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col justify-between h-[360px]">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-800 font-extrabold text-lg tracking-wide">Progress Metrics</h2>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 flex-1">
            {/* WELLS COMPLETED */}
            <div className="bg-[#eff6ff] rounded-lg p-5 flex flex-col justify-between">
              <span className="text-slate-500 font-extrabold text-xs tracking-wider uppercase leading-tight">
                WELLS<br />COMPLETED
              </span>
              <span className="text-5xl font-extrabold text-[#0052cc] font-sans">
                {stats?.wells_completed ?? 0}
              </span>
            </div>

            {/* ACTIVE TEAMS */}
            <div className="bg-[#eff6ff] rounded-lg p-5 flex flex-col justify-between">
              <span className="text-slate-500 font-extrabold text-xs tracking-wider uppercase leading-tight">
                ACTIVE<br />TEAMS
              </span>
              <span className="text-5xl font-extrabold text-slate-800 font-sans">
                {stats?.active_teams ?? 0}
              </span>
            </div>

            {/* BUDGET SPENT */}
            <div className="bg-[#eff6ff] rounded-lg p-5 flex flex-col justify-between">
              <span className="text-slate-500 font-extrabold text-xs tracking-wider uppercase leading-tight">
                BUDGET<br />SPENT
              </span>
              <span className="text-5xl font-extrabold text-slate-800 font-sans">
                {Math.round(stats?.budget_spent_percent ?? 0)}%
              </span>
            </div>
          </div>
        </div>

        {/* CRITICAL ALERTS CARD */}
        <div className="bg-[#fef2f2] border border-red-200/60 rounded-xl p-6 shadow-sm flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-[#991b1b] font-extrabold text-lg tracking-wide">Critical Alerts</h2>
              <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
            </div>

            {/* Bulleted Alerts List */}
            <ul className="mt-6 space-y-5">
              {alerts && alerts.length > 0 ? (
                alerts.map((alert) => (
                  <li key={alert.id} className="flex items-start gap-3">
                    <span className="w-3.5 h-3.5 border-2 border-[#ef4444] rounded-full shrink-0 mt-1" />
                    <span className="text-[#991b1b] text-sm font-bold leading-snug">
                      {alert.message}
                    </span>
                  </li>
                ))
              ) : (
                <div className="text-red-400 text-xs font-semibold">
                  No active critical alerts on site.
                </div>
              )}
            </ul>
          </div>
        </div>

      </div>

      {/* NEW ENTRY MODAL */}
      {isModalOpen && (
        <NewTaskModal
          projectId={projectId!}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            refetchStats(); // Refresh dynamic statistics
          }}
        />
      )}
    </div>
  );
}
