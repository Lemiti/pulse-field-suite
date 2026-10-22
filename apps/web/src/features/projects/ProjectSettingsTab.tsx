import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { 
  Partner, 
  ProjectPartnerResponse, 
  ProjectPartnerInput, 
  UpdateProjectPartnersRequest,
  ProjectResponse
} from '@pulse/shared-types';
import { 
  Handshake, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Globe,
  ChevronDown,
  Check,
  Users,
  Archive,
  Pencil
} from 'lucide-react';

interface ProjectSettingsTabProps {
  projectId: string;
  project: ProjectResponse | undefined;
}

export default function ProjectSettingsTab({ projectId, project }: ProjectSettingsTabProps) {
  const queryClient = useQueryClient();
  const isArchived = project?.status === 'COMPLETED' || (project?.status as string) === 'Archived';
  const [localPartners, setLocalPartners] = useState<ProjectPartnerResponse[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [newContribution, setNewContribution] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Archive Project states & mutation
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [confirmProjectName, setConfirmProjectName] = useState('');
  const [archiveJustification, setArchiveJustification] = useState('');

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project loaded");
      const payload = {
        name: project.name,
        description: project.description,
        budget_allocated: project.budget_allocated,
        funding_sources: Array.isArray(project.funding_sources) ? project.funding_sources : [],
        focus_area: project.focus_area,
        location_metadata: project.location_metadata,
        start_date: project.start_date,
        end_date: project.end_date,
        status: 'COMPLETED',
        sector_type: project.sector_type,
        risks_and_mitigations: project.risks_and_mitigations,
        assumptions: project.assumptions,
        outcomes_and_indicators: project.outcomes_and_indicators,
        total_income: project.total_income,
        donor_name: project.donor_name,
        project_leader_id: project.project_leader_id,
        member_ids: project.member_ids,
      };
      const res = await api.put(`/projects/${projectId}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['project', projectId], data);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setStatusMessage({ type: 'success', text: 'Project archived successfully.' });
      setIsArchiveModalOpen(false);
      setConfirmProjectName('');
      setArchiveJustification('');
    },
    onError: (err: any) => {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data || err?.message || 'Failed to archive project. Please try again.'
      });
    }
  });

  const isUnlockDisabled = confirmProjectName !== project?.name || !archiveJustification.trim();

  const [localLeaderId, setLocalLeaderId] = useState<string | null>(null);
  const [localMemberIds, setLocalMemberIds] = useState<string[]>([]);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const leaderDropdownRef = useRef<HTMLDivElement>(null);
  const membersDropdownRef = useRef<HTMLDivElement>(null);
  const [isLeaderOpen, setIsLeaderOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  // Sync leader and members state
  useEffect(() => {
    if (project) {
      setLocalLeaderId(project.project_leader_id || null);
      setLocalMemberIds(project.member_ids || []);
    }
  }, [project]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (leaderDropdownRef.current && !leaderDropdownRef.current.contains(event.target as Node)) {
        setIsLeaderOpen(false);
      }
      if (membersDropdownRef.current && !membersDropdownRef.current.contains(event.target as Node)) {
        setIsMembersOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Field Officers
  const { data: fieldOfficers = [] } = useQuery<any[]>({
    queryKey: ['field-officers'],
    queryFn: async () => {
      const res = await api.get('/users?role=FIELD_OFFICER');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const selectedLeader = fieldOfficers.find((u) => u.id === localLeaderId);
  const selectedLeaderName = selectedLeader ? selectedLeader.name : '';

  const selectedMembersNames = fieldOfficers
    .filter((u) => localMemberIds.includes(u.id))
    .map((u) => u.name);
  const selectedMembersLabel = selectedMembersNames.length > 0 ? selectedMembersNames.join(', ') : '';

  // Save Team mutation
  const saveTeamMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put(`/projects/${projectId}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['project', projectId], data);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setStatusMessage({ type: 'success', text: 'Project team and leader updated successfully.' });
      setTimeout(() => setStatusMessage(null), 5000);
      setIsEditingTeam(false);
    },
    onError: (err: any) => {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data || err?.message || 'Failed to update project team. Please try again.'
      });
    }
  });

  const handleSaveTeam = () => {
    if (!project) return;
    const payload = {
      name: project.name,
      description: project.description,
      budget_allocated: project.budget_allocated,
      funding_sources: Array.isArray(project.funding_sources) ? project.funding_sources : [],
      focus_area: project.focus_area,
      location_metadata: project.location_metadata,
      start_date: project.start_date,
      end_date: project.end_date,
      status: project.status,
      sector_type: project.sector_type,
      risks_and_mitigations: project.risks_and_mitigations,
      assumptions: project.assumptions,
      outcomes_and_indicators: project.outcomes_and_indicators,
      total_income: project.total_income,
      donor_name: project.donor_name,
      project_leader_id: localLeaderId,
      member_ids: localMemberIds,
    };
    saveTeamMutation.mutate(payload);
  };

  // 1. Fetch all global partners
  const { data: globalPartners = [] } = useQuery<Partner[]>({
    queryKey: ['partners'],
    queryFn: async () => {
      const res = await api.get('/partners');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // 2. Fetch partners linked to this project
  const { data: linkedPartnersData = [], isLoading, error } = useQuery<ProjectPartnerResponse[]>({
    queryKey: ['project-partners', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/partners`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!projectId
  });

  // Keep local state in sync with fetched data initially
  useEffect(() => {
    if (linkedPartnersData) {
      setLocalPartners(linkedPartnersData);
    }
  }, [linkedPartnersData]);

  // 3. Save partners mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: UpdateProjectPartnersRequest) => {
      const res = await api.post(`/projects/${projectId}/partners`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['project-partners', projectId], data);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setStatusMessage({ type: 'success', text: 'Funding and partners updated successfully.' });
      setTimeout(() => setStatusMessage(null), 5000);
    },
    onError: (err: any) => {
      setStatusMessage({ 
        type: 'error', 
        text: err?.response?.data || err?.message || 'Failed to update partners. Please try again.' 
      });
    }
  });

  // Calculate aggregated total of draft state
  const totalFunding = localPartners.reduce((sum, p) => sum + Number(p.contribution_amount), 0);

  // Filter global partners that are not already in localPartners
  const availablePartners = globalPartners.filter(
    gp => !localPartners.some(lp => lp.partner_id === gp.id)
  );

  // Add partner to local draft state
  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId || !newContribution) return;

    const partnerInfo = globalPartners.find(gp => gp.id === selectedPartnerId);
    if (!partnerInfo) return;

    const amount = parseFloat(newContribution);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid contribution amount.');
      return;
    }

    const newLink: ProjectPartnerResponse = {
      partner_id: partnerInfo.id,
      name: partnerInfo.name,
      type: partnerInfo.type,
      country_id: partnerInfo.country_id,
      contribution_amount: amount
    };

    setLocalPartners([...localPartners, newLink]);
    setSelectedPartnerId('');
    setNewContribution('');
  };

  // Remove partner from local draft state
  const handleRemovePartner = (partnerId: string) => {
    setLocalPartners(localPartners.filter(p => p.partner_id !== partnerId));
  };

  // Update contribution amount in local draft state
  const handleUpdateAmount = (partnerId: string, amountStr: string) => {
    const amount = parseFloat(amountStr) || 0;
    setLocalPartners(
      localPartners.map(p => 
        p.partner_id === partnerId 
          ? { ...p, contribution_amount: amount } 
          : p
      )
    );
  };

  // Submit draft state to backend
  const handleSave = () => {
    const payload: UpdateProjectPartnersRequest = {
      partners: localPartners.map(p => ({
        partner_id: p.partner_id,
        contribution_amount: p.contribution_amount
      }))
    };
    saveMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        <span className="text-sm font-bold text-slate-500 animate-pulse">Loading project funding...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        <span className="text-sm font-semibold">Failed to load project partners.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Status Notifications */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-350'
            : 'bg-red-50 dark:bg-red-950/25 border-red-200 dark:border-red-800 text-red-800 dark:text-red-350'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
          <span className="text-sm font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* ============= SECTION CONTAINER ============= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: PARTNERS TABLE & ADD FORM */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#0B1220] border-0 dark:border dark:border-slate-800 rounded-xl p-6 shadow-md dark:shadow-none space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Handshake className="w-5 h-5 text-[#1273DE]" />
                Funding & Partners
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Link global partners to this project and define their contribution towards the total budget.
              </p>
            </div>

            {/* Current Links List */}
            {localPartners.length === 0 ? (
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/10">
                <Building2 className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-350">No partners linked yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">Use the form below to add partner funding for this project.</p>
              </div>
            ) : (
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Partner Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Contribution Amount (ETB)</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {localPartners.map((lp) => (
                      <tr key={lp.partner_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block">
                            {lp.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/30">
                            {lp.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative max-w-[150px]">
                            <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-450 select-none">ETB</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={lp.contribution_amount || ''}
                              onChange={(e) => handleUpdateAmount(lp.partner_id, e.target.value)}
                              className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemovePartner(lp.partner_id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-900/50 transition-colors"
                            title="Unlink partner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Save Buttons */}
            {!isArchived && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setLocalPartners(linkedPartnersData)}
                  className="px-4 py-2 border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-355 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850"
                >
                  Reset Changes
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#1273DE] hover:bg-[#0F60BA] text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Funding Details'}
                </button>
              </div>
            )}
          </div>

          {/* Add Partner Form */}
          {!isArchived && (
            availablePartners.length > 0 ? (
              <form onSubmit={handleAddPartner} className="bg-white dark:bg-[#0B1220] border-0 dark:border dark:border-slate-800 rounded-xl p-6 shadow-md dark:shadow-none space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Link Global Partner</h4>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Select a global partner to associate with this project.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-505 dark:text-slate-400 uppercase tracking-wider mb-1">Select Partner *</label>
                    <select
                      required
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                    >
                      <option value="">-- Choose global partner --</option>
                      {availablePartners.map(gp => (
                        <option key={gp.id} value={gp.id}>
                          {gp.name} ({gp.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1">Contribution Amount (ETB) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-450 select-none">ETB</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        placeholder="e.g. 15000"
                        value={newContribution}
                        onChange={(e) => setNewContribution(e.target.value)}
                        className="w-full pl-12 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to List
                  </button>
                </div>
              </form>
            ) : globalPartners.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 text-center text-xs text-slate-550 italic">
                No global partners exist in the database. Please add partners on the global Partners page first.
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 text-center text-xs text-slate-550 italic">
                All available global partners are already linked to this project.
              </div>
            )
          )}
        </div>

        {/* RIGHT COLUMN: FUNDING SUMMARY CARD */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0B1220] border-0 dark:border dark:border-slate-800 rounded-xl p-6 shadow-md dark:shadow-none space-y-4">
            <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Financial Overview</h4>
            
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/20 rounded-xl">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Project Income (Aggregated)</span>
              <span className="text-3xl font-extrabold text-[#1273DE] mt-1 block">
                ${totalFunding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Calculated from linked funding sources above.</span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-xs font-semibold text-slate-650 dark:text-slate-350">
                <span>Allocated Budget:</span>
                <span>${(Number(project?.budget_allocated) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-650 dark:text-slate-350">
                <span>Total Budget Spent:</span>
                <span>${(Number(project?.budget_spent) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-650 dark:text-slate-350">
                <span>Financial Surplus/Deficit:</span>
                <span className={`font-bold ${totalFunding >= (Number(project?.budget_allocated) || 0) ? 'text-emerald-600 dark:text-emerald-450' : 'text-amber-600 dark:text-amber-450'}`}>
                  ${(totalFunding - (Number(project?.budget_allocated) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {totalFunding >= (Number(project?.budget_allocated) || 0) ? ' (Surplus)' : ' (Underfunded)'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-450 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>Saving updates will overwrite the project's total income field with this aggregated amount in compliance records.</span>
            </div>
          </div>

          {/* PROJECT TEAM & LEADERSHIP CARD */}
          <div className="bg-white dark:bg-[#0B1220] border border-slate-200/60 dark:border-slate-800 rounded-xl p-6 shadow-md dark:shadow-none space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#1273DE]" />
                  Project Team & Leadership
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Assign a Project Leader and add Team Members who have write permissions on this project.
                </p>
              </div>
              {!isArchived && !isEditingTeam && (
                <button
                  type="button"
                  onClick={() => setIsEditingTeam(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-905 dark:hover:text-blue-300 rounded transition"
                  title="Edit Team"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Team</span>
                </button>
              )}
            </div>

            {!isEditingTeam ? (
              <div className="space-y-5">
                {/* Leader View */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Project Leader
                  </span>
                  {selectedLeader ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                      {selectedLeader.avatar_url ? (
                        <img
                          src={selectedLeader.avatar_url}
                          alt={selectedLeader.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200/50"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold text-xs flex items-center justify-center border border-blue-200/30">
                          {selectedLeader.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                          {selectedLeader.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">
                          Field Officer / Lead
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      No Project Leader assigned.
                    </p>
                  )}
                </div>

                {/* Members View */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Team Members
                  </span>
                  {selectedMembersNames.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {fieldOfficers
                        .filter((u) => localMemberIds.includes(u.id))
                        .map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-855/60 bg-white dark:bg-slate-900/10"
                          >
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 font-bold text-[10px] flex items-center justify-center border border-slate-200/20">
                                {user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h5 className="text-xs font-bold text-slate-755 dark:text-slate-205">
                                {user.name}
                              </h5>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">
                                Field Team Member
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      No team members assigned.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Project Leader Selection */}
                <div className="relative" ref={leaderDropdownRef}>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Project Leader (Field Officer)
                  </label>
                  <button
                    type="button"
                    disabled={isArchived}
                    onClick={() => setIsLeaderOpen(!isLeaderOpen)}
                    className="w-full flex items-center justify-between border border-slate-200 dark:border-slate-855 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-105 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all text-left font-sans font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="truncate">
                      {selectedLeaderName || 'Select Project Leader...'}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-65 ml-2 flex-shrink-0" />
                  </button>
                  
                  {isLeaderOpen && (
                    <div className="absolute left-0 w-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setLocalLeaderId(null);
                          setIsLeaderOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800"
                      >
                        Unassigned (None)
                      </button>
                      {fieldOfficers.length === 0 ? (
                        <div className="px-4 py-2.5 text-sm text-slate-400 italic">No Field Officers found</div>
                      ) : (
                        fieldOfficers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setLocalLeaderId(user.id);
                              setIsLeaderOpen(false);
                            }}
                            className="w-full flex items-center justify-between text-left px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-850 dark:text-slate-202"
                          >
                            <span>{user.name}</span>
                            {localLeaderId === user.id && (
                              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Team Members Selection */}
                <div className="relative" ref={membersDropdownRef}>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Project Team Members
                  </label>
                  <button
                    type="button"
                    disabled={isArchived}
                    onClick={() => setIsMembersOpen(!isMembersOpen)}
                    className="w-full flex items-center justify-between border border-slate-200 dark:border-slate-855 rounded-lg px-4 py-2.5 text-slate-850 dark:text-slate-100 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all text-left font-sans font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="truncate">
                      {selectedMembersLabel || 'Select Team Members...'}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-65 ml-2 flex-shrink-0" />
                  </button>

                  {isMembersOpen && (
                    <div className="absolute left-0 w-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto font-sans">
                      {fieldOfficers.length === 0 ? (
                        <div className="px-4 py-2.5 text-sm text-slate-400 italic">No Field Officers found</div>
                      ) : (
                        fieldOfficers.map((user) => {
                          const isSelected = localMemberIds.includes(user.id);
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                const next = isSelected
                                  ? localMemberIds.filter((id) => id !== user.id)
                                  : [...localMemberIds, user.id];
                                setLocalMemberIds(next);
                                setIsMembersOpen(false);
                              }}
                              className="w-full flex items-center justify-between text-left px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-850 dark:text-slate-200"
                            >
                              <span>{user.name}</span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Edit Controls */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalLeaderId(project?.project_leader_id || null);
                      setLocalMemberIds(project?.member_ids || []);
                      setIsEditingTeam(false);
                    }}
                    className="px-4 py-2 border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-355 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-855"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTeam}
                    disabled={saveTeamMutation.isPending}
                    className="flex items-center gap-1.5 px-5 py-2 bg-[#1273DE] hover:bg-[#0F60BA] text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saveTeamMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ============= DANGER ZONE ============= */}
      {!isArchived && (
        <div className="border border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-955/10 rounded-xl p-6 mt-6 space-y-4">
          <div>
            <h4 className="text-base font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-650" />
              Archive Project
            </h4>
            <p className="text-red-700 dark:text-red-300 text-xs mt-1">
              This will freeze all financial and task inputs. Once archived, the project will be in read-only mode and all actions will be audited.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsArchiveModalOpen(true)}
              className="border border-red-600 text-red-700 hover:bg-red-50 dark:text-red-400 dark:border-red-850 dark:hover:bg-red-955/20 px-5 py-2.5 rounded-lg text-sm font-bold transition duration-155 cursor-pointer"
            >
              Archive Project
            </button>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 font-sans">
            
            {/* Warning Header */}
            <div className="flex items-start gap-3 text-red-650 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Archive Project</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This action is irreversible. All financial transactions, tasks, and changes for this project will be permanently frozen.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isUnlockDisabled) return;
                archiveMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Type the project name to confirm: <span className="font-mono text-slate-800 dark:text-slate-200 select-text">"{project?.name}"</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type project name exactly"
                  value={confirmProjectName}
                  onChange={(e) => setConfirmProjectName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Archive Justification / Audit Note *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide justification for archiving this project..."
                  value={archiveJustification}
                  onChange={(e) => setArchiveJustification(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsArchiveModalOpen(false);
                    setConfirmProjectName('');
                    setArchiveJustification('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-505 hover:text-slate-850 dark:text-slate-450 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUnlockDisabled || archiveMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {archiveMutation.isPending ? 'Archiving...' : 'Archive Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
