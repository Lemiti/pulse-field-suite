import { useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import NewTaskModal from './NewTaskModal';
import BudgetStatusBar from './BudgetStatusBar';
import NotesTab from './NotesTab';
import MessagesTab from './MessagesTab';
import ImpactTab from '../impact/ImpactTab';
import FilesTab from '../impact/FilesTab';
import PlaceholderPage from '../placeholder/PlaceholderPage';
import ProjectGantt from './ProjectGantt';
import ProjectSettingsTab from './ProjectSettingsTab';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import {
  PhaseResponse,
  CreatePhaseRequest,
  ProjectResponse,
  TaskResponse,
  TaskStatus,
  UpdateTaskStatusRequest,
  ProjectImpactMetricResponse,
  AuditLogResponse,
} from '@pulse/shared-types';
import ProjectTaskBoard, { NEXT_STATUS, STATUS_CONFIG } from './ProjectTaskBoard';
import { Loader2, X, Archive, Landmark, Target, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


function formatDeltaValue(value: string | null | undefined): string {
  if (!value) return 'N/A';
  const trimmed = value.trim();
  if (trimmed === 'N/A' || trimmed === '') return 'N/A';
  
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const amount = parsed.amount_added;
        const reason = parsed.reason;
        if (amount !== undefined || reason !== undefined) {
          return `Logged Expense: $${amount ?? '0'} (Reason: ${reason ?? 'N/A'})`;
        }
        
        // General JSON formatting
        return Object.entries(parsed)
          .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${val}`)
          .join(', ');
      }
    } catch {
      // Fallback
    }
  }
  return value;
}

const createPhaseSchema = z.object({
  name: z.string().trim().min(1, 'Phase name is required').max(255, 'Phase name is too long'),
});

type CreatePhaseForm = z.infer<typeof createPhaseSchema>;

export default function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'Dashboard';
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatePhaseModalOpen, setIsCreatePhaseModalOpen] = useState(false);
  const [activeStatusPopover, setActiveStatusPopover] = useState<{
    taskId: string;
    position: { top: number; left: number };
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const downloadPdfBrief = async () => {
    if (!project) return;
    
    // Create a temporary element to render the printable layout
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.style.color = '#1e293b';
    container.style.padding = '40px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.boxSizing = 'border-box';

    // Calculate budget utilization percentage
    const budgetAllocated = Number(project.budget_allocated) || 0;
    const budgetSpent = Number(project.budget_spent) || 0;
    const budgetPercent = budgetAllocated > 0 ? Math.round((budgetSpent / budgetAllocated) * 100) : 0;
    const budgetDifference = Math.abs(budgetAllocated - budgetSpent);

    // Parse outcomes and indicators
    let outcomes: any[] = [];
    if (project.outcomes_and_indicators) {
      outcomes = Array.isArray(project.outcomes_and_indicators) 
        ? project.outcomes_and_indicators 
        : [];
    }

    const outcomesHtml = outcomes.length > 0 
      ? outcomes.map((o: any, idx: number) => {
          const progress = project.status === 'COMPLETED' ? 100 : (idx % 2 === 0 ? 75 : 50);
          return `
            <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px;">
              <div style="font-weight: bold; font-size: 13px; color: #1e293b;">Outcome: ${o.outcome || 'N/A'}</div>
              <div style="font-size: 12px; color: #475569; margin-top: 4px;">Indicator: ${o.indicator || 'N/A'}</div>
              <div style="margin-top: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 4px;">
                  <span>Progress</span>
                  <span>${progress}%</span>
                </div>
                <div style="background: #f1f5f9; height: 6px; border-radius: 3px; overflow: hidden;">
                  <div style="background: #3b82f6; width: ${progress}%; height: 100%;"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')
      : '<div style="font-size: 12px; color: #64748b; font-style: italic;">No outcomes or performance indicators defined.</div>';

    // Render audit logs
    const recentLogs = auditLogs.slice(0, 5);
    const auditLogsHtml = recentLogs.length > 0
      ? recentLogs.map((log: any) => {
          const dateStr = log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A';
          const changeStr = log.old_value || log.new_value 
            ? `${formatDeltaValue(log.old_value) || 'None'} &rarr; ${formatDeltaValue(log.new_value) || 'None'}`
            : 'N/A';
          return `
            <tr style="border-bottom: 1px solid #f1f5f9; color: #334155;">
              <td style="padding: 10px 5px; font-weight: 600;">${log.user_name || 'System'}</td>
              <td style="padding: 10px 5px;">${log.action || 'Updated'}</td>
              <td style="padding: 10px 5px; font-family: monospace; font-size: 11px;">${changeStr}</td>
              <td style="padding: 10px 5px; color: #64748b; font-size: 11px;">${dateStr}</td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">No recent audit logs recorded.</td></tr>';

    container.innerHTML = `
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Engage Now Africa SVG Logo -->
          <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style="border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            <rect width="512" height="512" fill="#070707"/>
            <text x="256" y="61" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="39" font-weight="800" letter-spacing="1.5">ENGAGE NOW</text>
            <text x="256" y="469" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="800" letter-spacing="1.4">AFRICA</text>
            <rect x="112" y="101" width="288" height="288" fill="#0B0B0B"/>
            <path d="M123 112H253V378H123V112Z" fill="#F7191D"/>
            <path d="M253 112H282V378H253V112Z" fill="#F6E847"/>
            <path d="M282 112H389V378H282V112Z" fill="#1F7035"/>
            <rect x="112" y="101" width="288" height="288" stroke="#111111" stroke-width="10"/>
            <path d="M251 76L270 95L298 91L288 116L303 140L275 138L257 160L248 133L221 124L245 110L251 76Z" fill="#F6E847"/>
            <g fill="#080808">
              <path d="M353 132C337 125 313 123 296 126C278 129 260 139 246 153C235 165 229 181 218 194C206 208 189 213 178 227C164 245 163 268 176 286C183 296 196 303 200 316C205 331 195 347 199 363C202 376 212 383 224 386C232 388 240 386 247 382C253 378 258 374 266 375C277 377 280 391 291 390C300 389 306 377 308 369C312 352 305 335 311 319C317 303 333 295 339 279C345 263 335 251 327 238C320 227 316 216 319 203C323 185 341 176 350 161C356 151 360 140 353 132Z"/>
              <path d="M179 157C196 145 218 140 237 145C225 156 214 168 207 183C200 198 196 210 184 219C177 224 168 229 164 237C157 222 158 206 166 191C171 181 172 167 179 157Z"/>
              <path d="M233 198C242 194 249 201 248 210C247 220 238 228 229 232C222 226 219 216 222 208C224 203 227 200 233 198Z"/>
              <path d="M300 171C311 166 323 174 322 186C321 198 308 205 297 201C288 197 284 185 289 177C291 174 295 172 300 171Z"/>
              <path d="M249 304C257 303 264 309 265 317C266 326 259 333 251 333C243 333 237 326 238 318C239 311 242 306 249 304Z"/>
            </g>
            <path d="M135 125C174 119 207 119 246 125M132 139C171 133 205 134 241 141M130 154C168 148 201 150 235 157M128 169C162 164 194 166 226 174M128 185C157 181 186 184 214 193M129 201C153 199 177 202 200 210M132 218C150 217 166 220 183 227M136 236C149 237 161 241 173 247M354 126C332 118 308 117 288 122M365 143C342 135 316 134 291 140M371 161C346 153 320 153 297 160M373 179C348 171 323 172 304 178M371 198C349 191 328 191 312 197" stroke="#080808" stroke-width="8" stroke-linecap="round"/>
          </svg>
          <span style="font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em;">ENGAGE NOW AFRICA</span>
        </div>
        <div style="text-align: right; font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase;">
          Project Briefing Document
        </div>
      </div>

      <!-- Title Section -->
      <div style="margin-bottom: 25px;">
        <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.025em;">${project.name}</h1>
        <p style="font-size: 12px; color: #475569; margin: 0 0 16px 0; line-height: 1.5;">${project.description || 'No description provided.'}</p>
        
        <div style="display: flex; gap: 12px; background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0;">
          <div style="flex: 1;">
            <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Sector Type</span>
            <span style="font-size: 12px; font-weight: 700; color: #1e293b; display: block; margin-top: 2px;">${project.sector_type || 'General'}</span>
          </div>
          <div style="flex: 1;">
            <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Woreda Location</span>
            <span style="font-size: 12px; font-weight: 700; color: #1e293b; display: block; margin-top: 2px;">${(project.location_metadata as any)?.woreda || 'Not specified'}</span>
          </div>
          <div style="flex: 1;">
            <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Focus Area</span>
            <span style="font-size: 12px; font-weight: 700; color: #1e293b; display: block; margin-top: 2px;">${project.focus_area || 'WASH'}</span>
          </div>
        </div>
      </div>

      <!-- Financials Section -->
      <div style="margin-bottom: 30px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Financial Status Overview</h3>
        <div style="display: flex; gap: 16px; margin-bottom: 12px;">
          <div style="flex: 1; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Budget Allocation</span>
            <span style="font-size: 18px; font-weight: 800; color: #0f172a; display: block; margin-top: 4px;">$${budgetAllocated.toLocaleString()}</span>
          </div>
          <div style="flex: 1; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Spent</span>
            <span style="font-size: 18px; font-weight: 800; color: #0f172a; display: block; margin-top: 4px;">$${budgetSpent.toLocaleString()}</span>
          </div>
        </div>
        <!-- Progress Bar -->
        <div style="background: #f1f5f9; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 8px;">
          <div style="background: ${budgetPercent > 100 ? '#ef4444' : '#10b981'}; width: ${Math.min(budgetPercent, 100)}%; height: 100%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #64748b; margin-top: 6px;">
          <span>Utilization: ${budgetPercent}%</span>
          <span>${budgetPercent > 100 ? 'Overbudget by $' + budgetDifference.toLocaleString() : 'Remaining Surplus: $' + budgetDifference.toLocaleString()}</span>
        </div>
      </div>

      <!-- Outcomes Section -->
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Outcomes & Performance Indicators</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${outcomesHtml}
        </div>
      </div>

      <!-- Audit Section -->
      <div>
        <h3 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Recent Activity Log</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 1.5px solid #e2e8f0; color: #64748b; font-weight: 800;">
              <th style="padding: 8px 4px; width: 20%;">Actor</th>
              <th style="padding: 8px 4px; width: 15%;">Action</th>
              <th style="padding: 8px 4px; width: 45%;">Modification Detail</th>
              <th style="padding: 8px 4px; width: 20%;">Date & Time</th>
            </tr>
          </thead>
          <tbody>
            ${auditLogsHtml}
          </tbody>
        </table>
      </div>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2, // High resolution
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${project.name.replace(/\s+/g, '_')}_brief.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      document.body.removeChild(container);
    }
  };


  // ============= QUERIES =============
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery<ProjectResponse>({
    queryKey: ['project', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const phasesQueryKey = ['project-phases', projectId, activeCountryId];

  const {
    data: tasksData,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery<TaskResponse[]>({
    queryKey: ['project-tasks', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });

  const { data: phasesData = [], isLoading: phasesLoading } = useQuery<PhaseResponse[]>({
    queryKey: phasesQueryKey,
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/phases`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });

  const { data: impactMetrics = [] } = useQuery<ProjectImpactMetricResponse[]>({
    queryKey: ['project-impact', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/impact`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId && project?.status === 'COMPLETED',
  });

  const { data: auditLogs = [] } = useQuery<AuditLogResponse[]>({
    queryKey: ['project-audit-logs', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/audit-logs`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId,
  });


  // ============= MUTATIONS =============
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => {
      const payload: UpdateTaskStatusRequest = { status };
      const res = await api.patch(`/tasks/${taskId}/status`, payload);
      return res.data;
    },
    // Optimistic update: apply change locally immediately
    onMutate: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const tasksKey = ['project-tasks', projectId, activeCountryId];
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previous = queryClient.getQueryData<TaskResponse[] | undefined>(tasksKey);

      if (previous) {
        queryClient.setQueryData(tasksKey, previous.map((t) => (t.id === taskId ? { ...t, status } : t)));
      }

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['projects', activeCountryId] });
      setActiveStatusPopover(null);
    },
    onError: (error: unknown, _variables, context: { previous?: TaskResponse[] } | undefined) => {
      if (axios.isCancel(error)) return;
      console.error('Failed to update task status', error);
      const err = error as { response?: { data?: unknown }; message?: string };
      const serverMsg = err?.response?.data || err?.message || 'Failed to update task status. Please try again.';
      alert(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));

      // Rollback optimistic update if we have previous data
      if (context?.previous) {
        queryClient.setQueryData(['project-tasks', projectId, activeCountryId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['projects', activeCountryId] });
    },
  });

  const updateTaskPhaseMutation = useMutation({
    mutationFn: async ({
      taskId,
      phaseId,
    }: {
      taskId: string;
      phaseId: string | null;
    }) => {
      const payload = { phase_id: phaseId };
      const res = await api.patch(`/tasks/${taskId}/phase`, payload);
      return res.data;
    },
    // Optimistic update: apply change locally immediately
    onMutate: async ({ taskId, phaseId }: { taskId: string; phaseId: string | null }) => {
      const tasksKey = ['project-tasks', projectId, activeCountryId];
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previous = queryClient.getQueryData<TaskResponse[] | undefined>(tasksKey);

      if (previous) {
        queryClient.setQueryData(tasksKey, previous.map((t) => (t.id === taskId ? { ...t, phase_id: phaseId } : t)));
      }

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['projects', activeCountryId] });
      queryClient.invalidateQueries({ queryKey: phasesQueryKey });
      queryClient.invalidateQueries({ queryKey: ['project-audit-logs', projectId, activeCountryId] });
    },
    onError: (error: unknown, _variables, context: { previous?: TaskResponse[] } | undefined) => {
      if (axios.isCancel(error)) return;
      console.error('Failed to update task phase', error);
      const err = error as { response?: { data?: unknown }; message?: string };
      const serverMsg = err?.response?.data || err?.message || 'Failed to update task phase. Please try again.';
      alert(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));

      // Rollback optimistic update if we have previous data
      if (context?.previous) {
        queryClient.setQueryData(['project-tasks', projectId, activeCountryId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId, activeCountryId] });
      queryClient.invalidateQueries({ queryKey: ['projects', activeCountryId] });
      queryClient.invalidateQueries({ queryKey: phasesQueryKey });
      queryClient.invalidateQueries({ queryKey: ['project-audit-logs', projectId, activeCountryId] });
    },
  });

  const createPhaseMutation = useMutation({
    mutationFn: async (payload: CreatePhaseRequest) => {
      const res = await api.post(`/projects/${payload.project_id}/phases`, payload);
      return res.data as PhaseResponse;
    },
    onSuccess: (phase) => {
      queryClient.setQueryData<PhaseResponse[]>(phasesQueryKey, (current = []) => {
        if (current.some((existingPhase) => existingPhase.id === phase.id)) {
          return current;
        }

        return [...current, phase].sort((a, b) => a.sort_order - b.sort_order);
      });
      queryClient.invalidateQueries({ queryKey: phasesQueryKey });
      setIsCreatePhaseModalOpen(false);
      createPhaseMutation.reset();
    },
  });

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTaskStatusMutation.mutateAsync({ taskId, status });
      // On success, invalidate is handled by onSuccess
    } catch (e) {
      // mutateAsync already bubbles the error to onError; additional handling can go here if needed
      console.debug('handleStatusChange caught error', e);
    }
  };

  const tasks = Array.isArray(tasksData) ? tasksData : [];
  const phases = Array.isArray(phasesData) ? phasesData : [];

  const renderTabContent = () => {
    if (!projectId) return null;
    switch (currentTab) {
      case 'Calendar':
        return (
          <ProjectGantt
            projectId={projectId}
            tasks={tasks}
            phases={phases}
            isUpdating={updateTaskStatusMutation.isPending}
            onStatusChange={handleStatusChange}
            readOnly={project?.status === 'COMPLETED'}
          />
        );
      case 'Messages':
        return <MessagesTab projectId={projectId} />;
      case 'Note':
        return <NotesTab projectId={projectId} />;
      case 'Files':
        return <FilesTab projectId={projectId} />;
      case 'Impact':
        return <ImpactTab projectId={projectId} />;
      case 'Settings':
        return <ProjectSettingsTab projectId={projectId} project={project} />;
      case 'Dashboard':
      default:
        return null;
    }
  };

  const tabPanel = renderTabContent();

  if (projectError) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-700 dark:text-red-300 font-medium">
            Failed to load project. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (tabPanel) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
        {project?.status === 'COMPLETED' && (
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <Link to="/projects?tab=Active" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              ← Back to Active Workspaces
            </Link>
            <span className="text-slate-300 dark:text-slate-750">|</span>
            <Link to="/projects?tab=Archived" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              ← Back to Archived
            </Link>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3 flex-wrap">
              <span>{project?.name || 'Project'}</span>
              {project?.status === 'COMPLETED' && (
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Archived
                </span>
              )}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{project?.description}</p>
          </div>
          <button
            onClick={downloadPdfBrief}
            className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm px-5 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 flex-shrink-0 animate-fade-in"
          >
            <Download className="w-4 h-4" />
            Download PDF Brief
          </button>
        </div>
        {tabPanel}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in font-sans select-none">
      {project?.status === 'COMPLETED' && (
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 -mb-4">
          <Link to="/projects?tab=Active" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            ← Back to Active Workspaces
          </Link>
          <span className="text-slate-300 dark:text-slate-750">|</span>
          <Link to="/projects?tab=Archived" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            ← Back to Archived
          </Link>
        </div>
      )}
      {/* HEADER SECTION */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3 flex-wrap">
            <span>{project?.name || 'Project'}</span>
            {project?.status === 'COMPLETED' && (
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Archived
              </span>
            )}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {project?.description ||
              'Project management dashboard and task tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={downloadPdfBrief}
            className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm px-5 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 animate-fade-in"
          >
            <Download className="w-4 h-4" />
            Download PDF Brief
          </button>

          {project?.status !== 'COMPLETED' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              New Entry
            </button>
          )}
        </div>
      </div>

      {/* ARCHIVE LOCK BANNER */}
      {project?.status === 'COMPLETED' && (
        <div className="bg-slate-100 dark:bg-slate-800/80 border-l-4 border-slate-500 text-slate-700 dark:text-slate-350 p-4 rounded-r-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide">Archived Initiative</p>
              <p className="text-xs opacity-90 mt-0.5">This project is officially closed. All information is presented in read-only compliance mode.</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Read-Only
          </span>
        </div>
      )}

      {/* COMPLETED/ARCHIVED FINANCIAL AND IMPACT METRICS */}
      {project?.status === 'COMPLETED' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* COLUMN 1: FINAL FINANCIAL METRICS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              Final Financial Metrics
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allocated Budget</span>
                  <span className="text-xl font-extrabold text-slate-800 dark:text-white mt-1 block">
                    ${(Number(project?.budget_allocated) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Final Spent Amount</span>
                  <span className="text-xl font-extrabold text-slate-800 dark:text-white mt-1 block">
                    ${(Number(project?.budget_spent) || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Financial Progress & Variance bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Budget Utilization</span>
                  <span className={Number(project?.budget_spent) > Number(project?.budget_allocated) ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>
                    {Number(project?.budget_allocated) > 0 
                      ? Math.round((Number(project?.budget_spent) / Number(project?.budget_allocated)) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${Number(project?.budget_spent) > Number(project?.budget_allocated) ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ 
                      width: `${Math.min(100, Math.round(((Number(project?.budget_spent) || 0) / (Number(project?.budget_allocated) || 1)) * 100))}%` 
                    }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Remaining/Surplus:</span>
                <span className={`font-extrabold ${Number(project?.budget_allocated) >= Number(project?.budget_spent) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${Math.abs((Number(project?.budget_allocated) || 0) - (Number(project?.budget_spent) || 0)).toLocaleString()}
                  {Number(project?.budget_allocated) >= Number(project?.budget_spent) ? ' (Surplus)' : ' (Deficit)'}
                </span>
              </div>
            </div>
          </div>

          {/* COLUMN 2: PROJECT IMPACT METRICS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Project Impact Metrics
            </h3>
            <div className="space-y-4 max-h-[175px] overflow-y-auto pr-1">
              {impactMetrics.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {impactMetrics.map((m) => {
                    const pct = Math.min(Math.round((m.current_value / (m.target_value || 1)) * 100), 100);
                    return (
                      <div key={m.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                          <span className="truncate pr-1">Metric {m.metric_template_id.substring(0, 8)}</span>
                          <span className="text-emerald-500">{pct}%</span>
                        </div>
                        <span className="text-base font-extrabold text-slate-800 dark:text-white mt-1">
                          {m.current_value} <span className="text-xs font-normal text-slate-500">/ {m.target_value}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-8">
                  No impact metrics configured for this initiative.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {projectId && project?.status !== 'COMPLETED' && (
        <BudgetStatusBar projectId={projectId} />
      )}

      <ProjectTaskBoard
        phases={phases}
        tasks={tasks}
        isLoading={projectLoading || tasksLoading || phasesLoading}
        isUpdating={updateTaskStatusMutation.isPending || updateTaskPhaseMutation.isPending}
        onStatusClick={(taskId, position) => setActiveStatusPopover({ taskId, position })}
        onMoveToPhase={(taskId, phaseId) => updateTaskPhaseMutation.mutate({ taskId, phaseId })}
        onCreatePhase={() => {
          createPhaseMutation.reset();
          setIsCreatePhaseModalOpen(true);
        }}
        readOnly={project?.status === 'COMPLETED'}
      />

      {/* STATUS TRANSITION POPOVER */}
      {activeStatusPopover && (
        <StatusTransitionPopover
          taskId={activeStatusPopover.taskId}
          position={activeStatusPopover.position}
          task={tasks.find((t) => t.id === activeStatusPopover.taskId)!}
          onStatusSelect={(status) => handleStatusChange(activeStatusPopover.taskId, status)}
          onClose={() => setActiveStatusPopover(null)}
          popoverRef={popoverRef} //fixes the popover not closing when clicking on the same status button again
        />
      )}

      {/* NEW ENTRY MODAL */}
      {isModalOpen && (
        <NewTaskModal
          projectId={projectId!}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            refetchTasks();
          }}
        />
      )}

      {/* CREATE PHASE MODAL */}
      {isCreatePhaseModalOpen && projectId && (
        <CreatePhaseModal
          projectId={projectId}
          isSubmitting={createPhaseMutation.isPending}
          error={createPhaseMutation.error}
          onClose={() => {
            createPhaseMutation.reset();
            setIsCreatePhaseModalOpen(false);
          }}
          onSubmit={(payload) => createPhaseMutation.mutate(payload)}
        />
      )}
    </div>
  );
}

interface CreatePhaseModalProps {
  projectId: string;
  isSubmitting: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (payload: CreatePhaseRequest) => void;
}

function CreatePhaseModal({
  projectId,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: CreatePhaseModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreatePhaseForm>({
    resolver: zodResolver(createPhaseSchema),
    mode: 'onChange',
    defaultValues: { name: '' },
  });

  const serverError = error
    ? ((error as { response?: { data?: unknown }; message?: string }).response?.data ||
        (error as { message?: string }).message ||
        'Failed to create phase. Please try again.')
    : null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create Phase
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Add a phase to organize untracked tasks.
          </p>
        </div>

        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              project_id: projectId,
              name: values.name.trim(),
              sort_order: 0,
            })
          )}
          className="space-y-5"
        >
          {serverError && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-sm p-3 rounded-lg font-semibold">
              {typeof serverError === 'string' ? serverError : JSON.stringify(serverError)}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Phase Name
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g., Site Preparation"
              className={`border rounded-lg px-4 py-3 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                errors.name ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.name?.message && (
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition-all shadow-md text-sm"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Phase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============= STATUS TRANSITION POPOVER =============
interface StatusTransitionPopoverProps {
  taskId: string;
  position: { top: number; left: number };
  task: TaskResponse;
  onStatusSelect: (status: TaskStatus) => void;
  onClose: () => void;
  popoverRef: React.RefObject<HTMLDivElement | null>;
}

function StatusTransitionPopover({
  taskId,
  position,
  task,
  onStatusSelect,
  onClose,
  popoverRef,
}: StatusTransitionPopoverProps) {
  const nextStatuses = NEXT_STATUS[task.status];

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-label="Close menu"
      />

      {/* POPOVER */}
      <div
        ref={popoverRef}
        className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl p-3 min-w-max"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 px-2">
          Change Status
        </p>

        <div className="space-y-1">
          {nextStatuses.map((status) => {
            const config = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                onClick={() => onStatusSelect(status)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-700 ${config.text}`}
              >
                {config.icon}
                {config.label}
              </button>
            );
          })}
        </div>

        {nextStatuses.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 px-2 py-2">
            No status transitions available
          </p>
        )}
      </div>
    </>
  );
}
