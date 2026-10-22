import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import type { ProjectResponse, ProjectStatsResponse } from '@pulse/shared-types';
import { AlertTriangle } from 'lucide-react';

interface BudgetStatusBarProps {
  allocated?: number;
  spent?: number;
  projectId?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(value);
}

function getUtilizationStatus(utilizationPercent: number) {
  if (utilizationPercent > 100) {
    return {
      barColor: 'bg-red-500',
      statusLabel: 'Over Budget',
      statusBadgeColor: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
    };
  }
  if (utilizationPercent >= 90) {
    return {
      barColor: 'bg-amber-500',
      statusLabel: 'Critical',
      statusBadgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    };
  }
  if (utilizationPercent >= 86) {
    return {
      barColor: 'bg-amber-500',
      statusLabel: 'At Threshold',
      statusBadgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    };
  }
  return {
    barColor: 'bg-emerald-500',
    statusLabel: 'Healthy',
    statusBadgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  };
}

function BudgetBar({
  allocated,
  spent,
}: {
  allocated: number;
  spent: number;
}) {
  const utilizationPercent = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
  const barWidth = Math.min(utilizationPercent, 100);
  const isCritical = utilizationPercent > 90;
  const { barColor, statusLabel, statusBadgeColor } = getUtilizationStatus(utilizationPercent);

  return (
    <div
      className={`flex flex-col gap-2 w-full rounded-lg p-3 transition-shadow ${
        isCritical
          ? 'ring-2 ring-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.35)] dark:shadow-[0_0_24px_rgba(239,68,68,0.25)]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
          {isCritical && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
          Budget Utilization
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadgeColor}`}>
            {statusLabel}
          </span>
          <span className="text-sm font-extrabold text-gray-900 dark:text-slate-200">
            {utilizationPercent}%
          </span>
        </div>
      </div>

      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%` }}
          role="progressbar"
          aria-valuenow={utilizationPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <div>
          <span className="text-slate-400 font-semibold uppercase block">Allocated</span>
          <span className="text-gray-900 dark:text-slate-100 font-extrabold text-xs">
            {formatCurrency(allocated)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold uppercase block">Spent</span>
          <span className="text-gray-900 dark:text-slate-100 font-extrabold text-xs">
            {formatCurrency(spent)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold uppercase block">Remaining</span>
          <span className="text-gray-900 dark:text-slate-100 font-extrabold text-xs">
            {formatCurrency(Math.max(0, allocated - spent))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BudgetStatusBar({ allocated, spent, projectId }: BudgetStatusBarProps) {
  const { activeCountryId } = useActiveCountry();

  const { data: stats } = useQuery<ProjectStatsResponse>({
    queryKey: ['project-stats', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/stats`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const { data: project } = useQuery<ProjectResponse>({
    queryKey: ['project', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });

  if (projectId) {
    const alloc = Number(project?.budget_allocated) || 0;
    const spnt = Number(project?.budget_spent) || 0;
    const pctFromStats = stats?.budget_spent_percent ?? (alloc > 0 ? (spnt / alloc) * 100 : 0);

    if (!project && !stats) {
      return (
        <div className="h-16 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />
      );
    }

    return (
      <>
        <BudgetBar
          allocated={alloc}
          spent={spnt}
        />
        {pctFromStats > 90 && (
          <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-1">
            Budget alert: over 90% utilized ({Math.round(pctFromStats)}% per server stats).
          </p>
        )}
      </>
    );
  }

  const safeAllocated = typeof allocated === 'number' && allocated >= 0 ? allocated : 0;
  const safeSpent = typeof spent === 'number' && spent >= 0 ? spent : 0;

  return <BudgetBar allocated={safeAllocated} spent={safeSpent} />;
}
