import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import type { 
  CountryResponse, 
  ProjectResponse, 
  AssetResponse,
  BeneficiaryResponse, 
  BeneficiaryDependent, 
  DistributionLedgerEntry 
} from '@pulse/shared-types';
import { toast } from 'sonner';
import {
  Search,
  Users,
  MapPin,
  User,
  Calendar,
  Phone,
  AlertTriangle,
  ShieldAlert,
  Award,
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Handshake,
  Loader2,
  BarChart3
} from 'lucide-react';

interface Beneficiary {
  id: string;
  name: string;
  region: string;
  zone: string;
  woreda: string;
  focusArea: string;
  householdSize: number;
  contact: string;
  registrationDate: string;
  hasDuplicateWarning: boolean;
  duplicateDetails?: string;
  age: number;
  needs: string;
  projectIds: string[];
  isPending: boolean;
  sourceProjectId?: string;
  dependents: BeneficiaryDependent[];
  distributions: DistributionLedgerEntry[];
}

function mapBackendToFrontend(b: any): Beneficiary {
  let pids: string[] = [];
  if (Array.isArray(b.project_ids)) {
    pids = b.project_ids;
  } else if (typeof b.project_ids === 'string') {
    try {
      pids = JSON.parse(b.project_ids);
    } catch {
      pids = [];
    }
  }

  return {
    id: b.id,
    name: b.name,
    region: b.region,
    zone: b.zone,
    woreda: b.woreda,
    focusArea: b.focus_area,
    householdSize: b.household_size,
    contact: b.contact,
    registrationDate: b.registration_date,
    hasDuplicateWarning: b.has_duplicate_warning,
    duplicateDetails: b.duplicate_details || undefined,
    age: b.age,
    needs: b.needs || '',
    projectIds: pids,
    isPending: b.is_pending,
    sourceProjectId: b.source_project_id || undefined,
    dependents: b.dependents || [],
    distributions: b.distributions || [],
  };
}

export default function Beneficiaries() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<'field_worker' | 'project_manager'>('field_worker');
  const [searchParams, setSearchParams] = useSearchParams();
  const paramId = searchParams.get('id');
  const activeTab = searchParams.get('tab') || (paramId ? 'Directory' : 'Summary Overview');

  // Active country for boundaries and active projects
  const { activeCountryId } = useActiveCountry();

  // Modal states for capture profile
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalGovId, setModalGovId] = useState('');
  const [modalRegion, setModalRegion] = useState('');
  const [modalZone, setModalZone] = useState('');
  const [modalWoreda, setModalWoreda] = useState('');
  const [modalSourceProjectId, setModalSourceProjectId] = useState('');

  // Aid / Ration Distribution Modal states
  const [isDistModalOpen, setIsDistModalOpen] = useState(false);
  const [distProjectId, setDistProjectId] = useState('');
  const [distAssetId, setDistAssetId] = useState('');
  const [distQuantity, setDistQuantity] = useState<number>(1);

  const handleRegionChange = (val: string) => {
    setModalRegion(val);
    setModalZone('');
    setModalWoreda('');
  };

  const handleZoneChange = (val: string) => {
    setModalZone(val);
    setModalWoreda('');
  };

  const [selectedId, setSelectedId] = useState<string>('');

  // Load beneficiaries from backend
  const { data: rawBeneficiaries = [], isLoading: beneficiariesLoading } = useQuery<any[]>({
    queryKey: ['beneficiaries'],
    queryFn: async () => {
      const res = await api.get('/beneficiaries');
      return res.data;
    },
  });

  const allMappedBeneficiaries = useMemo(() => {
    return rawBeneficiaries.map(mapBackendToFrontend);
  }, [rawBeneficiaries]);

  const beneficiaries = useMemo(() => {
    return allMappedBeneficiaries.filter(b => !b.isPending);
  }, [allMappedBeneficiaries]);

  const pendingList = useMemo(() => {
    return allMappedBeneficiaries.filter(b => b.isPending);
  }, [allMappedBeneficiaries]);

  useEffect(() => {
    if (paramId) {
      setSelectedId(paramId);
    } else if (beneficiaries.length > 0 && !selectedId) {
      setSelectedId(beneficiaries[0].id);
    }
  }, [paramId, beneficiaries, selectedId]);

  // Load active country's administrative boundaries for cascading selects
  const { data: countryData, isLoading: countryLoading } = useQuery<CountryResponse>({
    queryKey: ['country', activeCountryId],
    queryFn: async () => {
      if (!activeCountryId) return null;
      const res = await api.get(`/countries/${activeCountryId}`);
      return res.data;
    },
    enabled: !!activeCountryId,
  });

  const boundaries = countryData?.administrative_boundaries || {};

  // Load all active projects in current country for linking
  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectResponse[]>({
    queryKey: ['projects-simple', activeCountryId],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
    enabled: !!activeCountryId,
  });

  // Load assets/inventory items
  const { data: assets = [] } = useQuery<AssetResponse[]>({
    queryKey: ['logistics-assets'],
    queryFn: async () => {
      const res = await api.get('/logistics/assets');
      return res.data;
    },
  });

  // Filtered beneficiaries based on search query
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter(b =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.woreda.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.zone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, beneficiaries]);

  const selectedBeneficiary = useMemo(() => {
    return allMappedBeneficiaries.find(b => b.id === selectedId) || beneficiaries[0];
  }, [selectedId, allMappedBeneficiaries, beneficiaries]);

  // Mutations
  const createBeneficiaryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/beneficiaries', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully captured profile for ${data.name}!`);
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      setIsModalOpen(false);
      // Clear form
      setModalName('');
      setModalGovId('');
      setModalRegion('');
      setModalZone('');
      setModalWoreda('');
      setModalSourceProjectId('');
      setSelectedId(data.id);
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data || err?.message || 'Failed to capture profile';
      toast.error(errMsg);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/beneficiaries/${id}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Approved beneficiary profile!`);
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      if (data.new_id) {
        setSelectedId(data.new_id);
      }
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data || err?.message || 'Failed to approve beneficiary';
      toast.error(errMsg);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/beneficiaries/${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      toast.error(`Rejected profile submission`);
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data || err?.message || 'Failed to reject beneficiary';
      toast.error(errMsg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/beneficiaries/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.error(`Deleted profile`);
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data || err?.message || 'Failed to delete beneficiary';
      toast.error(errMsg);
    }
  });

  const linkProjectMutation = useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const res = await api.post(`/beneficiaries/${id}/link-project`, { project_id: projectId });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Initiative linked to recipient profile.");
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
    },
    onError: (err: any) => {
      toast.error("Failed to link project.");
    }
  });

  const unlinkProjectMutation = useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const res = await api.post(`/beneficiaries/${id}/unlink-project`, { project_id: projectId });
      return res.data;
    },
    onSuccess: () => {
      toast.error("Initiative unlinked from recipient profile.");
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
    },
    onError: (err: any) => {
      toast.error("Failed to unlink project.");
    }
  });

  const distributeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/distributions', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Successfully issued aid distribution!`);
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-assets'] });
      setIsDistModalOpen(false);
      setDistProjectId('');
      setDistAssetId('');
      setDistQuantity(1);
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data || err?.message || 'Failed to issue aid';
      toast.error(errMsg);
    }
  });

  // Actions
  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleBulkImport = () => {
    toast.info("Bulk Import triggered: Select file dialog mock.");
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName || !modalGovId || !modalRegion || !modalZone || !modalWoreda || !modalSourceProjectId) {
      toast.error("Please fill in all fields including the cascading location and source project.");
      return;
    }

    createBeneficiaryMutation.mutate({
      name: modalName,
      region: modalRegion,
      zone: modalZone,
      woreda: modalWoreda,
      focus_area: "General Aid",
      household_size: 1,
      contact: "No phone registered",
      age: 25,
      needs: `Newly registered via field worker profile capture. Gov ID: ${modalGovId}.`,
      source_project_id: modalSourceProjectId,
    });
  };

  const handleDistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBeneficiary) return;
    if (!distProjectId || !distAssetId || distQuantity <= 0) {
      toast.error("Please fill in all distribution fields correctly.");
      return;
    }
    distributeMutation.mutate({
      beneficiary_id: selectedBeneficiary.id,
      project_id: distProjectId,
      asset_id: distAssetId,
      quantity: distQuantity,
    });
  };

  const handleLinkProject = (projectId: string) => {
    if (!selectedBeneficiary) return;
    linkProjectMutation.mutate({ id: selectedBeneficiary.id, projectId });
  };

  const handleUnlinkProject = (projectId: string) => {
    if (!selectedBeneficiary) return;
    unlinkProjectMutation.mutate({ id: selectedBeneficiary.id, projectId });
  };

  // Summary Metrics calculations
  const summaryStats = useMemo(() => {
    const total = beneficiaries.length;
    const pending = pendingList.length;

    // Household size calculations
    const totalHouseholdMembers = beneficiaries.reduce((sum, b) => sum + b.householdSize, 0);
    const avgHouseholdSize = total > 0 ? (totalHouseholdMembers / total).toFixed(1) : '0';

    // Breakdown by Program Type
    const programs: Record<string, number> = {};
    beneficiaries.forEach(b => {
      let area = 'General Aid';
      if (b.focusArea.includes('WASH')) area = 'WASH Initiatives';
      else if (b.focusArea.includes('Vocational')) area = 'Vocational Education';
      else if (b.focusArea.includes('Health')) area = 'Health & Medical';

      programs[area] = (programs[area] || 0) + 1;
    });

    // Breakdown by Woreda
    const woredas: Record<string, number> = {};
    beneficiaries.forEach(b => {
      woredas[b.woreda] = (woredas[b.woreda] || 0) + 1;
    });

    return {
      total,
      pending,
      avgHouseholdSize,
      programs,
      woredas
    };
  }, [beneficiaries, pendingList]);

  // Cascading lists for Modal Form
  const regionKeys = Object.keys(boundaries);
  const zoneKeys = modalRegion ? Object.keys(boundaries[modalRegion] || {}) : [];
  const woredaKeys = (modalRegion && modalZone) ? Object.keys(boundaries[modalRegion]?.[modalZone] || {}) : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] p-6 space-y-6 font-sans">
      {/* HEADER */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span>Beneficiary Database</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Registered local community recipients and program duplicate auditing.
          </p>
        </div>

        {/* Role Toggle Switch & Action Trigger */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
            <button
              onClick={() => setCurrentUserRole('field_worker')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentUserRole === 'field_worker'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              Field Worker
            </button>
            <button
              onClick={() => setCurrentUserRole('project_manager')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentUserRole === 'project_manager'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              Project Manager
            </button>
          </div>

          {/* Role-Based Primary Action */}
          {currentUserRole === 'field_worker' ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 font-sans cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Capture Profile
            </button>
          ) : (
            <button
              onClick={handleBulkImport}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 font-sans cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Bulk Import
            </button>
          )}
        </div>
      </div>

      {/* RENDER ACTIVE TAB VIEW */}
      {activeTab === 'Summary Overview' ? (
        /* ================= SUMMARY OVERVIEW TAB ================= */
        <div className="space-y-6 animate-fade-in">
          {/* STATS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex items-start justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Registered</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{summaryStats.total} Recipients</span>
                <span className="text-xs text-slate-500 dark:text-slate-450 block">Active database profiles</span>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex items-start justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approval</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{summaryStats.pending} Submissions</span>
                <span className="text-xs text-slate-500 dark:text-slate-450 block">Triaged by field workers</span>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex items-start justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Household Size</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{summaryStats.avgHouseholdSize} Members</span>
                <span className="text-xs text-slate-500 dark:text-slate-450 block">Family dependents average</span>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <User className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex items-start justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Programs</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{Object.keys(summaryStats.programs).length} Sectors</span>
                <span className="text-xs text-slate-500 dark:text-slate-450 block">Aid delivery areas</span>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* CHARTS / BREAKDOWNS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Box: Program Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Breakdown by Program Focus
              </h3>
              <div className="space-y-4">
                {Object.entries(summaryStats.programs).map(([prog, count]) => {
                  const pct = Math.round((count / summaryStats.total) * 100);
                  return (
                    <div key={prog} className="space-y-1">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{prog}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Box: Woreda Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Geographical Distribution (Woreda)
              </h3>
              <div className="space-y-4">
                {Object.entries(summaryStats.woredas).map(([woreda, count]) => {
                  const pct = Math.round((count / summaryStats.total) * 100);
                  return (
                    <div key={woreda} className="space-y-1">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{woreda}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= DIRECTORY TAB ================= */
        <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[calc(100vh-220px)] animate-fade-in">
          
          {/* LEFT MASTER PANE (30% width) */}
          <div className="w-full lg:w-[30%] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md p-5 flex flex-col gap-4">
            
            {/* PENDING SUBMISSIONS TRIAGE TABLE */}
            {currentUserRole === 'project_manager' && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Pending Submissions
                  </span>
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingList.length}
                  </span>
                </div>
                {pendingList.length === 0 ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center py-2">No pending submissions.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-blue-200/60 dark:border-blue-900/40 text-slate-500 text-[10px] uppercase font-bold">
                          <th className="pb-1.5 font-bold">Name</th>
                          <th className="pb-1.5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100/50 dark:divide-blue-900/20">
                        {pendingList.map((item) => (
                          <tr key={item.id} className="group">
                            <td className="py-2 pr-2">
                              <div className="font-bold text-gray-900 dark:text-white truncate max-w-[100px]">{item.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{item.woreda}</div>
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleApprove(item.id)}
                                  className="border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-955/20 px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(item.id)}
                                  className="border border-red-500 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-955/20 px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                placeholder="Search beneficiary or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>

            {/* SCROLLABLE LIST OF CARDS */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] lg:max-h-[580px] pr-1">
              {filteredBeneficiaries.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No beneficiaries found.</p>
              ) : (
                filteredBeneficiaries.map((b) => {
                  const isSelected = b.id === selectedId;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-300 dark:bg-blue-955/10 dark:border-blue-800/80'
                          : 'bg-white hover:bg-slate-50 border-slate-150 hover:border-slate-250 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-sm font-extrabold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                          {b.name}
                        </span>
                        {b.hasDuplicateWarning && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                        <span>{b.id}</span>
                        <span>{b.focusArea.split(' ')[0]}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{b.woreda}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT DETAIL PANE (70% width) */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md p-6 lg:p-8 flex flex-col justify-between">
            {selectedBeneficiary ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  
                  {/* DUPLICATE WARNING BANNER */}
                  {selectedBeneficiary.hasDuplicateWarning && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300 p-4 rounded-r-xl border border-y-amber-200 border-r-amber-200 dark:border-y-amber-900/40 dark:border-r-amber-900/40 animate-fade-in">
                      <div className="flex gap-3">
                        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">Potential Duplicate Detected</h4>
                          <p className="text-xs mt-1 leading-relaxed">
                            {selectedBeneficiary.duplicateDetails || "Multiple beneficiary profiles share similar name parameters in this region. Review official documents to verify identity."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DETAIL BODY */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-150 dark:border-slate-850 pb-6">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-955/50 px-2.5 py-1 rounded-full border border-blue-105 dark:border-blue-900/50">
                        {selectedBeneficiary.id}
                      </span>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mt-2">{selectedBeneficiary.name}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5 font-bold text-blue-600 dark:text-blue-400">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {selectedBeneficiary.region} &rarr; {selectedBeneficiary.zone} &rarr; {selectedBeneficiary.woreda}
                      </p>
                    </div>

                    <div className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm min-w-[250px]">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Household Dependents</span>
                      {selectedBeneficiary.dependents && selectedBeneficiary.dependents.length > 0 ? (
                        <div className="overflow-hidden border border-slate-150 dark:border-slate-800 rounded-lg">
                          <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800 text-left text-xs bg-white dark:bg-slate-900">
                            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                              <tr>
                                <th className="px-3 py-1.5">Age</th>
                                <th className="px-3 py-1.5">Vulnerability / Needs</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                              {selectedBeneficiary.dependents.map((dep: any) => (
                                <tr key={dep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="px-3 py-2 font-bold">{dep.age} years</td>
                                  <td className="px-3 py-2">{dep.vulnerability_notes || 'None'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-405 italic">No dependents registered. Household size: {selectedBeneficiary.householdSize}</p>
                      )}
                    </div>
                  </div>

                  {/* DETAILS FIELDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Focus Program</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Award className="w-4 h-4 text-blue-650 dark:text-blue-400" />
                          <span className="text-sm font-extrabold text-gray-900 dark:text-white">{selectedBeneficiary.focusArea}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Contact</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedBeneficiary.contact}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Age & Demographics</span>
                        <div className="flex items-center gap-2 mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <span>{selectedBeneficiary.age} Years Old</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registration Date</span>
                        <div className="flex items-center gap-2 mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{selectedBeneficiary.registrationDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Needs Block */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Program Needs Description</span>
                    <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">{selectedBeneficiary.needs}</p>
                  </div>

                  {/* PROJECT LINKING VIEW */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Linked Active Initiatives</span>
                      
                      {/* Linking dropdown select */}
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              handleLinkProject(val);
                              e.target.value = '';
                            }
                          }}
                          className="text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-955/20 dark:text-blue-400 border border-blue-150 dark:border-blue-900/40 rounded px-2.5 py-1 outline-none cursor-pointer"
                        >
                          <option value="">+ Link Initiative...</option>
                          {projects
                            .filter(p => !(selectedBeneficiary.projectIds || []).includes(p.id))
                            .map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(selectedBeneficiary.projectIds || []).length > 0 ? (
                        (selectedBeneficiary.projectIds || []).map(id => {
                          const proj = projects.find(p => p.id === id);
                          const name = proj ? proj.name : `Project ID: ${id.substring(0, 8)}`;
                          return (
                            <div key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200 shadow-sm animate-fade-in">
                              <Handshake className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="truncate max-w-[200px]">{name}</span>
                              <button
                                onClick={() => handleUnlinkProject(id)}
                                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 ml-1.5 font-bold cursor-pointer"
                                title="Unlink initiative"
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No linked initiatives or active aid sources.</p>
                      )}
                    </div>
                  </div>

                  {/* DISTRIBUTION LEDGER */}
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Distribution Ledger History</span>
                    {selectedBeneficiary.distributions && selectedBeneficiary.distributions.length > 0 ? (
                      <div className="overflow-hidden border border-slate-150 dark:border-slate-800 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800 text-left text-xs bg-white dark:bg-slate-900">
                          <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-wider font-sans">
                            <tr>
                              <th className="px-4 py-2">Initiative/Project</th>
                              <th className="px-4 py-2">Asset/Item</th>
                              <th className="px-4 py-2">Qty</th>
                              <th className="px-4 py-2">Issued By</th>
                              <th className="px-4 py-2">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                            {selectedBeneficiary.distributions.map((dist: any) => (
                              <tr key={dist.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white">{dist.project_name || 'Unknown Project'}</td>
                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-350">{dist.asset_name || 'Unknown Asset'}</td>
                                <td className="px-4 py-2.5 font-bold text-blue-600 dark:text-blue-400">{dist.quantity}</td>
                                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{dist.issued_by_user_name || 'Staff'}</td>
                                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                  {new Date(dist.issued_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No aid distributions recorded for this recipient.</p>
                    )}
                  </div>

                </div>

                {/* FOOTER ACTIONS */}
                <div className="pt-6 border-t border-slate-150 dark:border-slate-850 flex items-center justify-between gap-4 mt-6">
                  <div className="flex gap-4">
                    <button className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition duration-150 cursor-pointer">
                      Print Profile Card
                    </button>
                    {currentUserRole === 'project_manager' && (
                      <button
                        onClick={() => handleDelete(selectedBeneficiary.id)}
                        className="text-xs font-bold text-red-650 hover:text-red-750 dark:text-red-400 dark:hover:text-red-300 transition duration-150 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Profile
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => setIsDistModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Issue Ration / Aid
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <User className="w-12 h-12 mb-2 stroke-1" />
                <p className="text-sm font-semibold">Select a beneficiary to view details</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* CAPTURE PROFILE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 text-gray-900 dark:text-white">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Capture Beneficiary Profile</h3>
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="e.g. Almaz Kebede"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Government ID</label>
                <input
                  type="text"
                  required
                  value={modalGovId}
                  onChange={(e) => setModalGovId(e.target.value)}
                  placeholder="e.g. ID-ET-9821"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Source Project / Initiative</label>
                <select
                  required
                  value={modalSourceProjectId}
                  onChange={(e) => setModalSourceProjectId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Initiative...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Cascading Location Selectors */}
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Recipient Address (Cascading)</span>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Region</label>
                  <select
                    value={modalRegion}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Region...</option>
                    {regionKeys.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Zone</label>
                  <select
                    value={modalZone}
                    disabled={!modalRegion}
                    onChange={(e) => handleZoneChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Select Zone...</option>
                    {zoneKeys.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Woreda</label>
                  <select
                    value={modalWoreda}
                    disabled={!modalZone}
                    onChange={(e) => setModalWoreda(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Select Woreda...</option>
                    {woredaKeys.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBeneficiaryMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {createBeneficiaryMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISTRIBUTION MODAL */}
      {isDistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 text-gray-900 dark:text-white font-sans">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Issue Aid / Ration Distribution</h3>
            <form onSubmit={handleDistSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Recipient Name</label>
                <input
                  type="text"
                  disabled
                  value={selectedBeneficiary?.name || ''}
                  className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Project / Initiative</label>
                <select
                  required
                  value={distProjectId}
                  onChange={(e) => setDistProjectId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Asset / Inventory Item</label>
                <select
                  required
                  value={distAssetId}
                  onChange={(e) => setDistAssetId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Asset (Remaining Qty)...</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.asset_code}) - Stock: {(a as any).quantity ?? 0}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Distribution Quantity</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={distQuantity}
                  onChange={(e) => setDistQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDistModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={distributeMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {distributeMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Distribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
