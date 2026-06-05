import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import BudgetStatusBar from './BudgetStatusBar';
import CreateProjectModal from './CreateProjectModal';
import { ProjectResponse } from '@pulse/shared-types';
import { RequireRole } from '../../components/RequireRole';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import {
  Folder,
  Plus,
  DollarSign,
  Briefcase,
  Droplet,
  AlertOctagon,
  Search,
  Activity,
  Sparkles,
  ArrowUpRight,
  Archive,
} from 'lucide-react';

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function ProjectProgressBar({ percentage }: { percentage: number }) {
  const progress = clampPercentage(percentage);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Project Progress
        </span>
        <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
          {progress}%
        </span>
      </div>
      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-label="Project progress"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export default function ProjectsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'Active';
  const { activeCountryId } = useActiveCountry();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsModalOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: projectsData, isLoading, error } = useQuery<ProjectResponse[]>({
    queryKey: ['projects', activeCountryId, currentTab],
    queryFn: async () => {
      const url = currentTab === 'Archived' ? '/projects?status=COMPLETED' : '/projects';
      const res = await api.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];

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
        <p className="text-sm mt-2">Could not load projects. Ensure the API is running on port 8080.</p>
      </div>
    );
  }

  const displayProjects = projects.filter((p) => {
    if (currentTab === 'Templates') {
      return p.is_template === true;
    }
    if (p.is_template) {
      return false;
    }
    if (currentTab === 'Archived') {
      return p.status === 'COMPLETED';
    } else {
      return p.status !== 'COMPLETED';
    }
  });

  // Global portfolio metrics matching Home page (excluding templates)
  const activeProjects = projects.filter(
    (p) => !p.is_template && p.status !== 'COMPLETED' && p.status !== 'DRAFT'
  );
  const activeProjectsCount = activeProjects.length;

  const allPortfolioProjects = projects.filter((p) => !p.is_template);
  const totalBudget = allPortfolioProjects.reduce((acc, p) => acc + (Number(p.budget_allocated) || 0), 0);
  const totalSpent = allPortfolioProjects.reduce((acc, p) => acc + (Number(p.budget_spent) || 0), 0);
  const portfolioSpentPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const filteredProjects = displayProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const STATUS_ORDER = ['IN_PROGRESS', 'PLANNING', 'ON_HOLD', 'COMPLETED'] as const;
  const projectsByStatus = STATUS_ORDER.map((status) => ({
    status,
    items: filteredProjects.filter((p) => p.status === status),
  })).filter((g) => g.items.length > 0);

  const otherProjects = filteredProjects.filter(
    (p) => !STATUS_ORDER.includes(p.status as (typeof STATUS_ORDER)[number])
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in font-sans select-none">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-8 md:p-10 shadow-xl shadow-blue-500/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-blue-200">
              {currentTab === 'Archived' ? (
                <Archive className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {currentTab === 'Archived' ? 'Compliance Archives' : 'NGO Command Center'}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {currentTab === 'Archived' ? 'Archived Initiatives' : 'Active Workspaces'}
            </h1>
            <p className="text-blue-100 text-sm max-w-xl">
              {currentTab === 'Archived'
                ? 'Review final financials and impact metrics of completed projects in read-only compliance access.'
                : 'Manage field initiatives for your tenant. Use AI phase generation when creating a project.'}
            </p>
          </div>
          {currentTab !== 'Archived' && currentTab !== 'Templates' && (
            <RequireRole allowedRoles={['PROJECT_MANAGER', 'ADMIN']}>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-[#0f172a] font-extrabold text-sm px-6 py-4 rounded-xl shadow-lg transition-all shrink-0"
              >
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Create New Initiative</span>
              </button>
            </RequireRole>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs tracking-wider uppercase">
              {currentTab === 'Archived' ? 'Archived Initiatives' : 'Active Initiatives'}
            </span>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {currentTab === 'Archived'
                ? displayProjects.length
                : currentTab === 'Templates'
                ? displayProjects.length
                : activeProjectsCount}
            </h2>
          </div>
          <Briefcase className="w-6 h-6 text-blue-600" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs tracking-wider uppercase">Wells Completed</span>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">24</h2>
          </div>
          <Droplet className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs tracking-wider uppercase">Allocated Budget</span>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">${totalBudget.toLocaleString()}</h2>
          </div>
          <DollarSign className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs tracking-wider uppercase">Portfolio Spent</span>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">{portfolioSpentPercentage}%</h2>
          </div>
          <Activity className="w-6 h-6 text-amber-600" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Projects</h2>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="space-y-8">
          {filteredProjects.length > 0 ? (
            currentTab === 'Templates' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((p) => {
                  const allocatedBudget = Number(p.budget_allocated) || 0;
                  return (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between space-y-6"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 text-xs font-extrabold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md border border-blue-500/10">
                            {p.focus_area}
                          </span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Est. Budget: ${allocatedBudget.toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                          {p.name}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                          {p.description || 'No description provided.'}
                        </p>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Do you want to initialize a new active project workspace using the "${p.name}" template?`)) {
                              try {
                                const res = await api.post(`/projects/${p.id}/use-template`);
                                const newProjectId = res.data;
                                queryClient.invalidateQueries({ queryKey: ['projects'] });
                                navigate(`/projects/${newProjectId}?tab=Dashboard`);
                              } catch (err) {
                                console.error(err);
                                alert('Failed to copy project from template.');
                              }
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg transition-all shadow-sm cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Use Template</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {projectsByStatus.map(({ status, items }) => (
                  <div key={status} className="space-y-4">
                    <h3 className="text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {status.replace(/_/g, ' ')}
                      <span className="text-slate-400 font-bold">({items.length})</span>
                    </h3>
                    {items.map((p) => {
                      const allocatedBudget = Number(p.budget_allocated) || 0;
                      const spentBudget = Number(p.budget_spent) || 0;
                      return (
                        <div
                          key={p.id}
                          onClick={() => navigate(`/projects/${p.id}?tab=Dashboard`)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/20 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group space-y-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg shrink-0">
                              <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white group-hover:text-blue-600 truncate">
                                {p.name}
                              </h3>
                              <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                                {p.description || 'No description provided.'}
                              </p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                          </div>
                          <ProjectProgressBar percentage={Number(p.progress_percentage) || 0} />
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            <BudgetStatusBar allocated={allocatedBudget} spent={spentBudget} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {otherProjects.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider">Other</h3>
                    {otherProjects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/projects/${p.id}?tab=Dashboard`)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 cursor-pointer"
                      >
                        {p.name}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          ) : (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center space-y-4">
              <Folder className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-slate-500 text-sm">
                {searchTerm ? 'No projects match your search.' : 'Create your first initiative to get started.'}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Create First Initiative
              </button>
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
