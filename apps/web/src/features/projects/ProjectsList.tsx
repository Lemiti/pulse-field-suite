import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Folder,
  Plus,
  DollarSign,
  Briefcase,
  Droplet,
  AlertOctagon,
  Search,
  Activity,
  X,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

interface ProjectResponse {
  id: string;
  country_id: string;
  name: string;
  description: string | null;
  budget_allocated: number;
  budget_spent: number;
  status: string;
}

interface AuditLog {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export default function ProjectsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for creating a new project
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjBudget, setNewProjBudget] = useState('');
  const [newProjFunders, setNewProjFunders] = useState('');

  // 1. Query projects
  const { data: projects, isLoading, error } = useQuery<ProjectResponse[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });

  // 2. Query dynamic stats per project to aggregate portfolio metrics
  // We can fetch the first project's audit logs to feed our live activity feed panel
  const firstProjectId = projects?.[0]?.id;
  const { data: auditLogs } = useQuery<AuditLog[]>({
    queryKey: ['portfolio-audit-logs', firstProjectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${firstProjectId}/audit-logs`);
      return res.data;
    },
    enabled: !!firstProjectId,
  });

  // 3. Create Project Mutation
  const createProjectMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      budget_allocated: number;
      funding_sources: string[];
    }) => {
      const res = await api.post('/projects', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsModalOpen(false);
      // Reset form
      setNewProjName('');
      setNewProjDesc('');
      setNewProjBudget('');
      setNewProjFunders('');
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjBudget) return;

    createProjectMutation.mutate({
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      budget_allocated: parseFloat(newProjBudget),
      funding_sources: newProjFunders
        ? newProjFunders.split(',').map((s) => s.trim())
        : ['Client NGO Seed'],
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
        <span className="text-sm font-bold text-slate-500 animate-pulse">Loading portfolio dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg max-w-2xl mx-auto shadow-md">
        <h3 className="font-extrabold text-lg flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-red-600" />
          Server Connection Error
        </h3>
        <p className="text-sm mt-2">Could not establish contact with the Axum API backend. Please check database migrations and check backend console.</p>
      </div>
    );
  }

  // Calculated Portfolio statistics
  const totalProjects = projects?.length ?? 0;
  const totalBudget = projects?.reduce((acc, p) => acc + p.budget_allocated, 0) ?? 0;
  const totalSpent = projects?.reduce((acc, p) => acc + p.budget_spent, 0) ?? 0;
  const portfolioSpentPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Filter projects by search query
  const filteredProjects = projects?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in font-sans select-none">
      {/* 🚀 WELCOME GRADIENT BANNER */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-8 md:p-10 shadow-xl shadow-blue-500/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-blue-200">
              <Sparkles className="w-3.5 h-3.5" />
              NGO Command Center
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Welcome, Field Operations Director
            </h1>
            <p className="text-blue-100 text-sm max-w-xl">
              Track global metrics, initialize structural water resources, and secure multi-tenant site compliance in this portal.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-[#0f172a] font-extrabold text-sm px-6 py-4 rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 shrink-0"
          >
            <Plus className="w-5 h-5 text-blue-600" />
            <span>Create New Initiative</span>
          </button>
        </div>
      </div>

      {/* 📊 PORTFOLIO METRICS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Initiatives Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs tracking-wider uppercase">Active Initiatives</span>
            <h2 className="text-3xl font-extrabold text-slate-800">{totalProjects}</h2>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Wells completed metric mock */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs tracking-wider uppercase">Wells Completed</span>
            <h2 className="text-3xl font-extrabold text-slate-800">24</h2>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Droplet className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        {/* Portfolio Budget */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs tracking-wider uppercase">Allocated Budget</span>
            <h2 className="text-2xl font-extrabold text-slate-800">
              ${totalBudget.toLocaleString()}
            </h2>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <DollarSign className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        {/* Portfolio Budget Utilization */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs tracking-wider uppercase">Portfolio Spent</span>
            <h2 className="text-3xl font-extrabold text-slate-800">{portfolioSpentPercentage}%</h2>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Activity className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* SEARCH AND GRID LAYOUT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* PROJECTS SECTION */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Active Workspaces</h2>
            
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Dynamic projects card list */}
          <div className="space-y-4">
            {filteredProjects && filteredProjects.length > 0 ? (
              filteredProjects.map((p) => {
                const spentPercent = p.budget_allocated > 0
                  ? Math.round((p.budget_spent / p.budget_allocated) * 100)
                  : 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="bg-white border border-slate-200/70 hover:border-blue-500/20 rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3.5 bg-blue-50 group-hover:bg-blue-100 rounded-lg shrink-0 transition-colors">
                        <Folder className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="space-y-1 max-w-md">
                        <h3 className="text-lg font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-slate-500 text-xs line-clamp-1">
                          {p.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking */}
                    <div className="flex items-center gap-8 shrink-0">
                      <div className="flex flex-col gap-1 w-28">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>UTILIZATION</span>
                          <span className="text-slate-700">{spentPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.min(spentPercent, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Go directly button indicator */}
                      <span className="p-1.5 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all">
                        <ArrowUpRight className="w-5 h-5" />
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-bold">
                No matching field workspaces found.
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Activity Logs Feed Panel */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Live Activity Stream
            </h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase">
              Compliance Logs
            </span>
          </div>

          <ul className="space-y-6">
            {auditLogs && auditLogs.length > 0 ? (
              auditLogs.slice(0, 5).map((log) => {
                const formattedDate = new Date(log.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <li key={log.id} className="relative pl-6 before:absolute before:left-1.5 before:top-1.5 before:bottom-[-24px] before:w-[2px] before:bg-slate-100 last:before:hidden">
                    <span className="absolute left-0 top-1.5 w-3 h-3 bg-blue-600 border-2 border-white rounded-full shadow-sm shadow-blue-500/40" />
                    <div className="space-y-1">
                      <p className="text-xs text-slate-700 font-bold leading-normal">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span className="text-blue-500">ID: {log.user_id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </li>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                Waiting for field entry logs...
              </div>
            )}
          </ul>
        </div>

      </div>

      {/* CREATE INITIATIVE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Create Initiative</h2>
              <p className="text-slate-500 text-sm mt-1">Add a new field project under active country bounds.</p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-5">
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Initiative Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Clean Drinking Water Project Ghana"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="border border-slate-300 rounded-lg px-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  placeholder="Summarize objectives..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  rows={3}
                  className="border border-slate-300 rounded-lg px-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Budget */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Allocated Budget (USD)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 50000"
                  value={newProjBudget}
                  onChange={(e) => setNewProjBudget(e.target.value)}
                  className="border border-slate-300 rounded-lg px-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              {/* Funding Sources */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Funding Sources (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., UNICEF, USAID, Government"
                  value={newProjFunders}
                  onChange={(e) => setNewProjFunders(e.target.value)}
                  className="border border-slate-300 rounded-lg px-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending || !newProjName.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-all shadow-md text-sm"
                >
                  {createProjectMutation.isPending ? 'Saving...' : 'Launch Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
