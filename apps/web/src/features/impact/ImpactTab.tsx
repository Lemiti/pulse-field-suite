import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import { canEditImpactMetrics, getUserClaims } from '../../lib/auth';
import type { ProjectImpactMetricResponse, UpdateImpactMetricRequest } from '@pulse/shared-types';
import { Dialog } from '../../components/ui/Dialog';
import { BadgeAlert, Gauge } from 'lucide-react';

interface ImpactTabProps {
  projectId: string;
}

function ImpactGauge({
  metric,
  onEdit,
  canEdit,
}: {
  metric: ProjectImpactMetricResponse;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const target = metric.target_value || 1;
  const current = metric.current_value;
  const pct = Math.min(Math.round((current / target) * 100), 100);

  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => canEdit && onEdit()}
      className={`text-left w-full rounded-xl border p-5 transition-all ${
        canEdit
          ? 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 cursor-pointer'
          : 'border-slate-200 dark:border-slate-700 cursor-default'
      } ${metric.is_manual_override ? 'ring-2 ring-amber-400/60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            Metric {metric.metric_template_id.slice(0, 8)}
          </span>
        </div>
        {metric.is_manual_override && (
          <span
            title="[Value adjusted manually by Admin]"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wide shrink-0"
          >
            <BadgeAlert className="w-3 h-3" />
            [Value adjusted manually by Admin]
          </span>
        )}
      </div>

      <div className="relative w-full h-28 flex items-center justify-center">
        <svg viewBox="0 0 120 70" className="w-full max-w-[200px]">
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
            strokeWidth="10"
          />
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="currentColor"
            className="text-emerald-500"
            strokeWidth="10"
            strokeDasharray={`${(pct / 100) * 157} 157`}
          />
        </svg>
        <div className="absolute bottom-2 text-center">
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{current}</p>
          <p className="text-xs text-slate-500">of {target} target</p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">{pct}% of target</p>
    </button>
  );
}

export default function ImpactTab({ projectId }: ImpactTabProps) {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const claims = getUserClaims();
  const canEdit = canEditImpactMetrics(claims?.role);
  const [editingMetric, setEditingMetric] = useState<ProjectImpactMetricResponse | null>(null);
  const [newValue, setNewValue] = useState('');

  const { data: metrics = [], isLoading } = useQuery<ProjectImpactMetricResponse[]>({
    queryKey: ['project-impact', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/impact`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      metricId,
      payload,
    }: {
      metricId: string;
      payload: UpdateImpactMetricRequest;
    }) => {
      const res = await api.patch(`/projects/${projectId}/impact/${metricId}`, payload);
      return res.data as ProjectImpactMetricResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-impact', projectId] });
      setEditingMetric(null);
      setNewValue('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
        No impact metrics configured for this project yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <ImpactGauge
            key={metric.id}
            metric={metric}
            canEdit={canEdit}
            onEdit={() => {
              setEditingMetric(metric);
              setNewValue(String(metric.current_value));
            }}
          />
        ))}
      </div>

      <Dialog
        open={!!editingMetric}
        onOpenChange={(open) => !open && setEditingMetric(null)}
        title="Update impact metric"
      >
        {editingMetric && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = parseFloat(newValue);
              if (!Number.isFinite(val)) return;
              updateMutation.mutate({
                metricId: editingMetric.id,
                payload: { current_value: val },
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Current value</label>
              <input
                type="number"
                step="any"
                required
                spellCheck={false}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save override'}
            </button>
          </form>
        )}
      </Dialog>
    </>
  );
}
