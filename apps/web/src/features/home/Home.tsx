import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  Briefcase, 
  DollarSign, 
  Sparkles, 
  Plus, 
  FileText, 
  History, 
  AlertTriangle, 
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  User,
  Clock,
  ExternalLink
} from 'lucide-react';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import type { DashboardSummary } from '@pulse/shared-types';
import { Link } from 'react-router-dom';

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'IN_PROGRESS':
      return (
        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
          In Progress
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
          Completed
        </span>
      );
    case 'PLANNING':
      return (
        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800">
          Planning
        </span>
      );
    case 'ON_HOLD':
      return (
        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
          On Hold
        </span>
      );
    case 'DRAFT':
      return (
        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
          Draft
        </span>
      );
    default:
      return (
        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
          {status}
        </span>
      );
  }
}

export default function Home() {
  const { activeCountryId } = useActiveCountry();

  const { data: summary, isLoading, error } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', activeCountryId],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data;
    },
    enabled: !!activeCountryId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
        <span className="text-sm font-bold text-slate-500 animate-pulse">Loading command center dashboard...</span>
      </div>
    );
  }

  const isAuthError =
    error &&
    (error as any).response &&
    ((error as any).response.status === 401 || (error as any).response.status === 403);

  if (isAuthError) {
    return (
      <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-200 rounded-lg max-w-2xl mx-auto shadow-md">
        <h3 className="font-extrabold text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Session Expired
        </h3>
        <p className="text-sm mt-2">Your session has expired or you are not authorized to view this data. Please log in again to continue.</p>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('activeCountryId');
            window.location.href = '/login';
          }}
          className="mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Log In Again
        </button>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg max-w-2xl mx-auto shadow-md">
        <h3 className="font-extrabold text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Server Connection Error
        </h3>
        <p className="text-sm mt-2">Could not load dashboard summary data. Ensure the API is running on port 8080.</p>
      </div>
    );
  }

  const { global_metrics, recent_projects, action_items, activity_feed } = summary;
  const portfolioSpentPercentage = global_metrics.total_budget_allocated > 0 
    ? Math.round((global_metrics.total_budget_spent / global_metrics.total_budget_allocated) * 100) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in font-sans select-none">
      
      {/* ================= SECTION 0: COMMAND CENTER HEADER ================= */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-8 md:p-10 shadow-xl shadow-blue-500/10">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-blue-200">
            <Sparkles className="w-3.5 h-3.5" />
            NGO Command Center
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Portfolio Summary</h1>
          <p className="text-blue-100 text-sm max-w-xl">
            Live overview of active initiatives, financial tracking, system warnings, and field officer operations.
          </p>
        </div>
      </div>

      {/* ================= SECTION 1: TOP RIBBON METRICS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Card 1: Active Projects */}
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider block">Active Initiatives</span>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">{global_metrics.active_projects_count}</h2>
            <span className="text-[10px] text-slate-500 block">Excluding workspace template drafts</span>
          </div>
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
            <Briefcase className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Metric Card 2: Budget vs Spent */}
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider block">Portfolio Budget & Spent</span>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white truncate max-w-[200px]">
              {formatCurrency(global_metrics.total_budget_spent)} / {formatCurrency(global_metrics.total_budget_allocated)}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full" 
                  style={{ width: `${Math.min(100, portfolioSpentPercentage)}%` }} 
                />
              </div>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">{portfolioSpentPercentage}% Spent</span>
            </div>
          </div>
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
            <DollarSign className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        {/* Metric Card 3: Avg KPI Progress */}
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider block">Target Progress Average</span>
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {global_metrics.average_progress_percentage.toFixed(1)}%
            </h2>
            <span className="text-[10px] text-slate-500 block">Calculated across all active tasks</span>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
            <Activity className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

      {/* ================= MIDDLE GRID: RECENT PROJECTS & SYSTEM ALERTS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECTION 2 (Middle-Left): Quick-Access Project Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-850 dark:text-white">Recently Updated Projects</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Fast access to monitor progress metrics and run summaries</p>
            </div>
            <Link 
              to="/projects" 
              className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              All Projects <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recent_projects.length === 0 ? (
            <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
              <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No projects recorded yet.</p>
              <Link to="/projects?create=true" className="mt-3 inline-flex text-xs font-bold text-blue-600 dark:text-blue-400">
                Create the first project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recent_projects.map((project) => (
                <div 
                  key={project.id} 
                  className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900 rounded-xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">
                        {project.name}
                      </h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 h-8">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Mini Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">{Math.round(project.progress_percentage)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full" 
                          style={{ width: `${project.progress_percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <Link 
                        to={`/projects/${project.id}`} 
                        className="text-xs font-extrabold text-slate-650 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                      >
                        Workspace <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <Link 
                        to={`/reports?project=${project.id}`}
                        className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Create Report
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3 (Middle-Right): Action Items & System Alerts */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-850 dark:text-white">Action Items & System Alerts</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Critical tasks, budget thresholds, and compliance flags</p>
          </div>

          <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 max-h-[345px] overflow-y-auto min-h-[300px]">
            {action_items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 h-full">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">All Systems Clear</h3>
                <p className="text-xs text-slate-400 max-w-[180px]">No pending alert flags or review requests reported.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {action_items.map((item) => {
                  const isAlert = item.item_type === 'ALERT';
                  const isCritical = item.severity === 'CRITICAL' || item.severity === 'HIGH';
                  return (
                    <div 
                      key={item.id} 
                      className={`p-3 rounded-lg border flex gap-2 items-start ${
                        isAlert 
                          ? isCritical 
                            ? 'bg-red-50 border-red-150 dark:bg-red-950/20 dark:border-red-900/50' 
                            : 'bg-amber-50 border-amber-150 dark:bg-amber-950/20 dark:border-amber-900/50'
                          : 'bg-blue-50 border-blue-150 dark:bg-blue-950/20 dark:border-blue-900/50'
                      }`}
                    >
                      {isAlert ? (
                        <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCritical ? 'text-red-650' : 'text-amber-600'}`} />
                      ) : (
                        <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                      )}
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-tight ${
                          isAlert 
                            ? isCritical 
                              ? 'text-red-800 dark:text-red-300' 
                              : 'text-amber-800 dark:text-amber-300'
                            : 'text-blue-800 dark:text-blue-300'
                        }`}>
                          {item.message}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500">
                          <span className="font-semibold truncate max-w-[120px]">{item.project_name}</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= BOTTOM GRID: ACTIVITY TIMELINE & QUICK ACTIONS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECTION 4 (Bottom-Left): Dynamic Field Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-850 dark:text-white">Live Field Activity Feed</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Chronological list of compliance logs and worker status updates</p>
          </div>

          <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm min-h-[300px]">
            {activity_feed.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">Waiting for new audit or field activity...</p>
            ) : (
              <ul className="space-y-6">
                {activity_feed.map((act, index) => {
                  const isAudit = act.activity_type === 'AUDIT';
                  return (
                    <li 
                      key={act.id} 
                      className="relative pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-[-28px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800 last:before:hidden"
                    >
                      <span className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#0B1220] ${
                        isAudit ? 'bg-blue-600' : 'bg-emerald-500'
                      }`} />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-700 dark:text-slate-200">
                            <span className="font-extrabold text-slate-900 dark:text-white mr-1">{act.user_name}</span>
                            {isAudit ? (
                              <span className="text-slate-500">
                                performed compliance action <span className="font-semibold text-slate-800 dark:text-slate-300">{act.content.toLowerCase().replace(/_/g, ' ')}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                posted field observation: <span className="font-semibold italic text-slate-800 dark:text-slate-300">"{act.content}"</span>
                              </span>
                            )}
                          </p>
                          <span className="text-[10px] text-slate-400 block font-semibold">{act.project_name}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(act.created_at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* SECTION 5 (Bottom-Right): Quick Actions Panel */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-850 dark:text-white">Quick Actions</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Common administrative actions and reporting shortcuts</p>
          </div>

          <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 min-h-[300px] flex flex-col justify-center">
            
            {/* Quick Action Button 1: Create New Project */}
            <Link 
              to="/projects?create=true" 
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900 bg-slate-50/50 dark:bg-slate-900/50 transition duration-150 group cursor-pointer"
            >
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-slate-850 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Create New Project
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Start the 3-step creation wizard</p>
              </div>
            </Link>

            {/* Quick Action Button 2: Generate Donor Report */}
            <Link 
              to="/reports" 
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 bg-slate-50/50 dark:bg-slate-900/50 transition duration-150 group cursor-pointer"
            >
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-slate-850 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Generate Donor Report
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">View BvA financial budgets and KPI outputs</p>
              </div>
            </Link>

            {/* Quick Action Button 3: View Audit History */}
            <Link 
              to="/audit-logs" 
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-900 bg-slate-50/50 dark:bg-slate-900/50 transition duration-150 group cursor-pointer"
            >
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
                <History className="w-5 h-5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-slate-850 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  View Audit History
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Track live logs and database status changes</p>
              </div>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
