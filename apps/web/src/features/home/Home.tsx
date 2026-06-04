import { useQuery } from '@tanstack/react-query';
import { Activity, Briefcase, Droplet, DollarSign, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import type { AuditLogResponse, ProjectResponse } from '@pulse/shared-types';
import { Link } from 'react-router-dom';

export default function Home() {
  const { activeCountryId } = useActiveCountry();

  const { data: projects = [] } = useQuery<ProjectResponse[]>({
    queryKey: ['projects', activeCountryId],
    queryFn: async () => {
      const res = await api.get('/projects');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const firstProjectId = projects[0]?.id;

  const { data: auditLogs = [], isLoading: logsLoading } = useQuery<AuditLogResponse[]>({
    queryKey: ['home-audit-logs', firstProjectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${firstProjectId}/audit-logs`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!firstProjectId,
  });

  const totalProjects = projects.length;
  const totalBudget = projects.reduce((acc, p) => acc + (Number(p.budget_allocated) || 0), 0);
  const totalSpent = projects.reduce((acc, p) => acc + (Number(p.budget_spent) || 0), 0);
  const portfolioSpentPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-8 md:p-10 shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider text-blue-200">
            <Sparkles className="w-3.5 h-3.5" />
            NGO Command Center
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Home</h1>
          <p className="text-blue-100 text-sm max-w-xl">
            Portfolio overview and live compliance activity for your active country tenant.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">Active Initiatives</span>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">{totalProjects}</h2>
          </div>
          <Briefcase className="w-6 h-6 text-blue-600" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">Wells Completed</span>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">24</h2>
          </div>
          <Droplet className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">Allocated Budget</span>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">${totalBudget.toLocaleString()}</h2>
          </div>
          <DollarSign className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">Portfolio Spent</span>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">{portfolioSpentPercentage}%</h2>
          </div>
          <Activity className="w-6 h-6 text-amber-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-white mb-2">Quick links</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Jump into project workspaces or create a new initiative.
          </p>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg"
          >
            View all projects
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Live Activity Stream
            </h2>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full uppercase">
              Compliance Logs
            </span>
          </div>

          {!firstProjectId ? (
            <p className="text-xs text-slate-500 text-center py-6">Create a project to see audit activity.</p>
          ) : logsLoading ? (
            <div className="animate-pulse h-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          ) : auditLogs.length > 0 ? (
            <ul className="space-y-6">
              {auditLogs.slice(0, 8).map((log) => (
                <li
                  key={log.id}
                  className="relative pl-6 before:absolute before:left-1.5 before:top-1.5 before:bottom-[-24px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-700 last:before:hidden"
                >
                  <span className="absolute left-0 top-1.5 w-3 h-3 bg-blue-600 border-2 border-white dark:border-slate-900 rounded-full" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {log.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 text-center py-6">Waiting for field entry logs…</p>
          )}
        </div>
      </div>
    </div>
  );
}
