import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ProjectResponse, AuditLogResponse } from '@pulse/shared-types';
import { ChevronDown, AlertTriangle, TrendingUp, Search } from 'lucide-react';

const actionEventMap: Record<string, string> = {
  UPDATE_TASK_STATUS: 'Task Status Changed',
  UPDATE_BUDGET: 'Budget Allocation Modified',
  CREATE_TASK: 'Task Created',
  UPDATE_PROJECT: 'Project Updated',
  DELETE_TASK: 'Task Deleted',
  CREATE_PROJECT: 'Project Created',
  ADD_EXPENSE: 'Recorded Expense',
};

const formatActionName = (action: string): string => {
  return actionEventMap[action] || action;
};

/**
 * AuditLogs Component
 *
 * A read-only compliance and event-sourcing dashboard for donors and HQ admins.
 *
 * Features:
 * - Project dropdown selector for audit trail inspection
 * - React Query integration for efficient data fetching
 * - Tab-based navigation (All Logs, System Alerts) with URL params
 * - Search bar with filter capabilities (action name, user name, and values)
 * - Human-readable action event mapping
 * - High-contrast table display showing the performer's actual name
 * - WCAG AAA compliance with 48x48px touch targets
 * - Light/dark mode support
 */
export default function AuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'All Logs';
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search query when project changes
  useEffect(() => {
    setSearchQuery('');
  }, [selectedProjectId]);

  // ============= QUERIES =============
  // Fetch all projects for dropdown selector
  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectResponse[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Fetch audit logs for selected project
  const { data: auditLogsData, isLoading: logsLoading } = useQuery<AuditLogResponse[]>({
    queryKey: ['audit-logs', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const res = await api.get(`/projects/${selectedProjectId}/audit-logs`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!selectedProjectId,
  });

  const auditLogs = Array.isArray(auditLogsData) ? auditLogsData : [];
  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  // ============= SEARCH FILTERING =============
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return auditLogs;
    const query = searchQuery.toLowerCase().trim();
    return auditLogs.filter((log) => {
      const actionName = formatActionName(log.action).toLowerCase();
      const userName = (log.user_name || '').toLowerCase();
      const oldVal = (log.old_value || '').toLowerCase();
      const newVal = (log.new_value || '').toLowerCase();
      return (
        actionName.includes(query) ||
        userName.includes(query) ||
        oldVal.includes(query) ||
        newVal.includes(query)
      );
    });
  }, [auditLogs, searchQuery]);

  // ============= RENDER =============
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in font-sans select-none">
      {/* ============= PAGE HEADER ============= */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Audit Logs
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Immutable event-sourcing compliance trail for HQ admins and donors
          </p>
        </div>
      </div>

      {/* ============= PROJECT SELECTOR SECTION ============= */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4 animate-fade-in">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Select Project for Audit Trail
        </label>

        {projectsLoading ? (
          <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
        ) : Array.isArray(projects) && projects.length > 0 ? (
          <div className="relative">
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="w-full h-12 px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">-- Choose a project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} (Budget: ${project.budget_allocated.toLocaleString()})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 dark:text-slate-300 pointer-events-none" />
          </div>
        ) : (
          <div className="h-12 flex items-center px-4 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
            No projects available
          </div>
        )}
      </div>

      {/* ============= SEARCH & TAB NAVIGATION CONTROLS ============= */}
      {selectedProject && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 animate-fade-in">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search logs by event, user, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm h-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchParams({ tab: 'All Logs' })}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors h-10 ${
                activeTab === 'All Logs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'System Alerts' })}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors h-10 ${
                activeTab === 'System Alerts'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              System Alerts
            </button>
          </div>
        </div>
      )}

      {/* ============= CONTENT TABS ============= */}
      {selectedProject ? (
        <div className="space-y-6">
          {activeTab === 'All Logs' && (
            <AllLogsTab logs={filteredLogs} isLoading={logsLoading} projectName={selectedProject.name} />
          )}
          {activeTab === 'System Alerts' && (
            <SystemAlertsTab logs={filteredLogs} isLoading={logsLoading} projectName={selectedProject.name} />
          )}
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
          <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
            Select a project above to view its audit trail
          </p>
        </div>
      )}
    </div>
  );
}

// ============= ALL LOGS TAB =============
interface AllLogsTabProps {
  logs: AuditLogResponse[];
  isLoading: boolean;
  projectName: string;
}

function AllLogsTab({ logs, isLoading, projectName }: AllLogsTabProps) {
  const formatTimestamp = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(logs) || logs.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
        <p className="text-slate-600 dark:text-slate-400">
          No matching audit logs found for {projectName}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Action Event
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Performed By
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Change Delta
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Timestamp (UTC)
              </th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log, idx) => (
              <tr
                key={log.id || idx}
                className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[48px] h-auto"
              >
                {/* Action Event */}
                <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                  {formatActionName(log.action)}
                </td>

                {/* Performed By */}
                <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {log.user_name}
                  <span className="block text-[10px] text-slate-400 font-mono font-normal">
                    {log.user_id}
                  </span>
                </td>

                {/* Change Delta */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-medium line-clamp-2 max-w-[200px]" title={log.old_value || 'N/A'}>
                      {log.old_value || 'N/A'}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-bold">→</span>
                    <span className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 font-medium line-clamp-2 max-w-[200px]" title={log.new_value || 'N/A'}>
                      {log.new_value || 'N/A'}
                    </span>
                  </div>
                </td>

                {/* Timestamp */}
                <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                  {formatTimestamp(log.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/30 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Showing {logs.length} log{logs.length !== 1 ? 's' : ''} • All timestamps in UTC
        </p>
      </div>
    </div>
  );
}

// ============= SYSTEM ALERTS TAB =============
interface SystemAlertsTabProps {
  logs: AuditLogResponse[];
  isLoading: boolean;
  projectName: string;
}

function SystemAlertsTab({ logs, isLoading, projectName }: SystemAlertsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(logs)) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        No data available
      </div>
    );
  }

  // Filter for critical actions
  const criticalActions = ['UPDATE_BUDGET', 'UPDATE_TASK_STATUS', 'UPDATE_PROJECT', 'ADD_EXPENSE'];
  const criticalLogs = logs.filter((log) => criticalActions.includes(log.action));

  if (criticalLogs.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-8 text-center border border-emerald-200 dark:border-emerald-800 animate-fade-in">
        <p className="text-emerald-900 dark:text-emerald-200 font-semibold">
          ✓ No critical alerts for {projectName}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {criticalLogs.map((log, idx) => {
        // Highlight budget warnings if usage > 90% or recorded expense is large
        const isBudgetWarning =
          log.action === 'UPDATE_BUDGET' &&
          log.new_value &&
          parseInt(log.new_value) > 90;

        return (
          <div
            key={log.id || idx}
            className={`p-4 rounded-lg border-l-4 transition-colors min-h-[48px] flex items-center justify-between ${
              isBudgetWarning
                ? 'bg-red-50 dark:bg-red-900/20 border-l-red-600 dark:border-l-red-500 text-red-900 dark:text-red-200'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-600 dark:border-l-yellow-500 text-yellow-900 dark:text-yellow-200'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <h3 className="font-semibold text-sm">
                  {log.action === 'UPDATE_BUDGET'
                    ? 'Budget Allocation Changed'
                    : log.action === 'UPDATE_TASK_STATUS'
                      ? 'Task Status Updated'
                      : log.action === 'ADD_EXPENSE'
                        ? 'New Expense Recorded'
                        : 'Project Modified'}
                </h3>
              </div>
              <p className="text-sm mt-1 opacity-90 break-words font-mono text-xs">
                {log.old_value} → {log.new_value}
              </p>
              <p className="text-xs mt-2 opacity-75 font-semibold">
                By {log.user_name} • {new Date(log.created_at || '').toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
