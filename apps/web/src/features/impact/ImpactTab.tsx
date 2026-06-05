import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import { canEditImpactMetrics, getUserClaims } from '../../lib/auth';
import type { 
  ProjectImpactMetricResponse, 
  UpdateImpactMetricRequest, 
  GlobalMetricTemplate, 
  AssignImpactMetricRequest 
} from '@pulse/shared-types';
import { Dialog } from '../../components/ui/Dialog';
import { BadgeAlert, Plus, Activity, Check } from 'lucide-react';

interface ImpactTabProps {
  projectId: string;
}

function ImpactProgressBar({
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
    <div
      className={`bg-white dark:bg-[#0B1220] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:border-blue-300 dark:hover:border-blue-900 transition-all ${
        metric.is_manual_override ? 'ring-2 ring-amber-450/40 dark:ring-amber-500/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white line-clamp-1">
            {metric.display_name}
          </h3>
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Code: {metric.code}
          </span>
        </div>
        {metric.is_manual_override && (
          <span
            title="Value adjusted manually by Admin"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 text-[9px] font-extrabold uppercase tracking-wide shrink-0"
          >
            <BadgeAlert className="w-3 h-3" />
            Admin Override
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-500 dark:text-slate-400">
            {current.toLocaleString()} of {target.toLocaleString()} {metric.unit}
          </span>
          <span className="text-slate-700 dark:text-slate-200">
            {pct}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-850">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Log Current Value
          </button>
        </div>
      )}
    </div>
  );
}

export default function ImpactTab({ projectId }: ImpactTabProps) {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const claims = getUserClaims();

  const { data: project } = useQuery<any>({
    queryKey: ['project', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const canEdit = canEditImpactMetrics(claims?.role) && project?.status !== 'COMPLETED';
  
  // Dialog State: Edit Current Value
  const [editingMetric, setEditingMetric] = useState<ProjectImpactMetricResponse | null>(null);
  const [newValue, setNewValue] = useState('');

  // Dialog State: Add Metric
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');

  // Fetch Project specific metrics
  const { data: metrics = [], isLoading } = useQuery<ProjectImpactMetricResponse[]>({
    queryKey: ['project-impact', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/impact`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });

  // Fetch Global templates
  const { data: templates = [] } = useQuery<GlobalMetricTemplate[]>({
    queryKey: ['global-metric-templates', activeCountryId],
    queryFn: async () => {
      const res = await api.get('/admin/metric-templates');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!activeCountryId,
  });

  // Mutation: Update logged current value
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

  // Mutation: Assign a new metric template
  const assignMutation = useMutation({
    mutationFn: async (payload: AssignImpactMetricRequest) => {
      const res = await api.post(`/projects/${projectId}/impact`, payload);
      return res.data as ProjectImpactMetricResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-impact', projectId] });
      setIsAddOpen(false);
      setSelectedTemplateId('');
      setTargetValue('');
      setCurrentValue('');
    },
  });

  // Filter templates: only show unassigned ones
  const assignedTemplateIds = new Set(metrics.map((m) => m.metric_template_id));
  const availableTemplates = templates.filter((t) => !assignedTemplateIds.has(t.id));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Tab header bar */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Impact Analytics</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track and log key performance indicators against global templates</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex h-9 items-center gap-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" /> Add Metric
          </button>
        )}
      </div>

      {metrics.length === 0 ? (
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center max-w-2xl mx-auto space-y-4">
          <Activity className="w-10 h-10 text-slate-300 dark:text-slate-650 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">No Impact Metrics Configured</h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Assign metric templates to this initiative to monitor progress against outcomes.</p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex h-9 items-center gap-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Configure First Metric
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric) => (
            <ImpactProgressBar
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
      )}

      {/* Dialog: Log Current Value */}
      <Dialog
        open={!!editingMetric}
        onOpenChange={(open) => !open && setEditingMetric(null)}
        title="Log Current Value"
      >
        {editingMetric && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = parseInt(newValue, 10);
              if (isNaN(val)) return;
              updateMutation.mutate({
                metricId: editingMetric.id,
                payload: { current_value: val },
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Metric Name</span>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{editingMetric.display_name}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="log_value" className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Current Logged Value ({editingMetric.unit})
              </label>
              <input
                id="log_value"
                type="number"
                required
                spellCheck={false}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-550/50 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
            >
              {updateMutation.isPending ? 'Logging…' : 'Log Value'}
            </button>
          </form>
        )}
      </Dialog>

      {/* Dialog: Add New Metric */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => !open && setIsAddOpen(false)}
        title="Add Project Impact Metric"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const target = parseInt(targetValue, 10);
            const current = parseInt(currentValue, 10) || 0;
            if (!selectedTemplateId || isNaN(target)) return;

            assignMutation.mutate({
              metric_template_id: selectedTemplateId,
              target_value: target,
              current_value: current,
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="metric_template" className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Select Metric Template
            </label>
            {availableTemplates.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                All templates have already been assigned to this project.
              </p>
            ) : (
              <select
                id="metric_template"
                required
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg overflow-hidden focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Choose Template --</option>
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name} ({t.unit})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="target_val" className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Target Value
              </label>
              <input
                id="target_val"
                type="number"
                min="1"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="current_val" className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Initial Current Value
              </label>
              <input
                id="current_val"
                type="number"
                min="0"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="e.g. 0"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={assignMutation.isPending || !selectedTemplateId}
            className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-550/50 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
          >
            {assignMutation.isPending ? 'Assigning…' : 'Configure Metric'}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
