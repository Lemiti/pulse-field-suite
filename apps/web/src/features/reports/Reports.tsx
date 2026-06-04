import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  ReportSummaryResponse,
  BvaProjectSummary,
  ImpactMetricSummary
} from '@pulse/shared-types';
import {
  BarChart3,
  Download,
  TrendingUp,
  DollarSign,
  Target,
  Search,
  Briefcase,
  Percent,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'bva';
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch the report summary data
  const { data: reportData, isLoading, error } = useQuery<ReportSummaryResponse>({
    queryKey: ['reports-summary'],
    queryFn: async () => {
      const res = await api.get('/reports/summary');
      return res.data;
    },
  });

  // Calculate top-level stats
  const stats = useMemo(() => {
    if (!reportData) return {
      totalBudget: 0,
      totalSpent: 0,
      utilization: 0,
      avgProgress: 0,
      projectCount: 0,
      kpiCount: 0
    };

    const bva = reportData.bva_summary || [];
    const impact = reportData.impact_summary || [];

    const totalBudget = bva.reduce((sum, p) => sum + p.budget_allocated, 0);
    const totalSpent = bva.reduce((sum, p) => sum + p.budget_spent, 0);
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const avgProgress = impact.length > 0
      ? impact.reduce((sum, m) => sum + m.progress_percentage, 0) / impact.length
      : 0;

    return {
      totalBudget,
      totalSpent,
      utilization,
      avgProgress,
      projectCount: bva.length,
      kpiCount: impact.length
    };
  }, [reportData]);

  // Filtered lists based on search query
  const filteredBva = useMemo(() => {
    const bvaList = reportData?.bva_summary || [];
    if (!searchQuery.trim()) return bvaList;
    const q = searchQuery.toLowerCase().trim();
    return bvaList.filter(p =>
      p.project_name.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  const filteredImpact = useMemo(() => {
    const impactList = reportData?.impact_summary || [];
    if (!searchQuery.trim()) return impactList;
    const q = searchQuery.toLowerCase().trim();
    return impactList.filter(m =>
      m.project_name.toLowerCase().includes(q) ||
      m.metric_name.toLowerCase().includes(q) ||
      m.metric_code.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  // Export engine handler
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (activeTab === 'bva') {
      filename = `budget_vs_actuals_${new Date().toISOString().split('T')[0]}.csv`;
      headers = [
        'Project ID',
        'Project Name',
        'Budget Allocated ($)',
        'Budget Spent ($)',
        'Variance ($)',
        'Utilization (%)'
      ];
      rows = filteredBva.map(p => [
        p.project_id,
        p.project_name,
        p.budget_allocated.toFixed(2),
        p.budget_spent.toFixed(2),
        p.variance.toFixed(2),
        p.utilization_percentage.toFixed(2)
      ]);
    } else {
      filename = `impact_kpis_${new Date().toISOString().split('T')[0]}.csv`;
      headers = [
        'Project Name',
        'Metric Code',
        'Metric Name',
        'Current Value',
        'Target Value',
        'Unit',
        'Progress (%)'
      ];
      rows = filteredImpact.map(m => [
        m.project_name,
        m.metric_code,
        m.metric_name,
        m.current_value.toString(),
        m.target_value.toString(),
        m.unit || '',
        m.progress_percentage.toFixed(2)
      ]);
    }

    // Escape CSV values to avoid injection/formatting breaks
    const escapeCsvValue = (val: string) => {
      const escaped = val.replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in font-sans p-6">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 font-sans">
        <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          <TrendingDown className="w-12 h-12" />
          <h2 className="text-xl font-bold">Failed to load reports</h2>
          <p className="text-sm text-red-400">Please verify you have permissions or check connection status.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in font-sans p-6 select-none">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Reports Dashboard
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-11">
            Aggregate country-level budget utilization and strategic impact KPI performance metrics.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Export to CSV</span>
        </button>
      </div>

      {/* OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Budget */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Budgeted</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              ${stats.totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Across {stats.projectCount} projects</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spent</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              ${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Current expenditures</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Global Budget Utilization */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Utilization</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats.utilization.toFixed(1)}%
            </div>
            {/* Miniature progress bar */}
            <div className="w-32 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full rounded-full ${stats.utilization > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(stats.utilization, 100)}%` }}
              />
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-lg">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        {/* Average Impact Metric Progress */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">KPI Target Progress</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats.avgProgress.toFixed(1)}%
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Across {stats.kpiCount} global targets</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-lg">
            <Target className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* CONTROLS: TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-sm">
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg self-start">
          <button
            onClick={() => {
              setSearchParams({ tab: 'bva' });
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
              activeTab === 'bva'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Budget vs Actuals</span>
          </button>
          
          <button
            onClick={() => {
              setSearchParams({ tab: 'kpi' });
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
              activeTab === 'kpi'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Impact KPIs</span>
          </button>
        </div>

        {/* Real-time search filter */}
        <div className="relative flex-1 max-w-sm sm:w-80">
          <input
            type="text"
            placeholder={activeTab === 'bva' ? 'Search by project name...' : 'Search by project, metric or code...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm h-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold transition-colors"
            >
              Clear
            </button>
          )}
        </div>

      </div>

      {/* MAIN DATA TABLES */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        
        {activeTab === 'bva' ? (
          /* ============= BUDGET VS ACTUALS TABLE ============= */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Budget Allocated</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Budget Spent</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Variance</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Utilization %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80 text-sm">
                {filteredBva.length > 0 ? (
                  filteredBva.map((p) => {
                    const isOverBudget = p.variance < 0;
                    return (
                      <tr
                        key={p.project_id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          {p.project_name}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                          ${p.budget_allocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                          ${p.budget_spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${isOverBudget ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isOverBudget ? '-' : ''}${Math.abs(p.variance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-12 font-bold ${p.utilization_percentage > 100 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                              {p.utilization_percentage.toFixed(1)}%
                            </span>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className={`h-full rounded-full ${
                                  p.utilization_percentage > 100
                                    ? 'bg-red-500'
                                    : p.utilization_percentage > 85
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(p.utilization_percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No project budget records matching the search query.
                    </td>
                  </tr>
                )}
              </tbody>
              
              {/* Aggregations Footer */}
              {filteredBva.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="px-6 py-4">Total Summary</td>
                    <td className="px-6 py-4 text-right">
                      ${filteredBva.reduce((sum, p) => sum + p.budget_allocated, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      ${filteredBva.reduce((sum, p) => sum + p.budget_spent, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      ${filteredBva.reduce((sum, p) => sum + p.variance, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const totalAlloc = filteredBva.reduce((sum, p) => sum + p.budget_allocated, 0);
                        const totalSpent = filteredBva.reduce((sum, p) => sum + p.budget_spent, 0);
                        const overallPct = totalAlloc > 0 ? (totalSpent / totalAlloc) * 100 : 0;
                        return `${overallPct.toFixed(1)}%`;
                      })()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          /* ============= IMPACT KPIS TABLE ============= */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">KPI Code</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">KPI Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Target</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Current Value</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Achievement Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80 text-sm">
                {filteredImpact.length > 0 ? (
                  filteredImpact.map((m, idx) => {
                    const progress = Math.min(m.progress_percentage, 100);
                    const isCompleted = m.progress_percentage >= 100;
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                          {m.project_name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 text-xs font-bold tracking-wide uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600">
                            {m.metric_code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                          {m.metric_name}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                          {m.target_value.toLocaleString()} {m.unit}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-950 dark:text-white">
                          {m.current_value.toLocaleString()} {m.unit}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-12 font-bold ${isCompleted ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>
                              {m.progress_percentage.toFixed(1)}%
                            </span>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden max-w-[120px] relative">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isCompleted ? 'bg-emerald-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            {isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No KPI performance metrics matching the search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
      </div>

    </div>
  );
}
