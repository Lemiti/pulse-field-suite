import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { getUserClaims } from '../../lib/auth';
import type { AssetResponse, PipelineResponse } from '@pulse/shared-types';
import { toast } from 'sonner';
import {
  Truck,
  ClipboardList,
  Database,
  Calendar,
  User,
  AlertTriangle,
  ShieldCheck,
  X,
  Loader2,
  DollarSign
} from 'lucide-react';

// Form schemas
const assetSchema = z.object({
  asset_code: z.string().min(1, 'Asset code is required').max(50, 'Code is too long'),
  name: z.string().min(1, 'Asset name is required').max(255, 'Name is too long'),
  serial: z.string().min(1, 'Serial ID is required').max(100, 'Serial is too long'),
  location: z.string().min(1, 'Location is required').max(255, 'Location is too long'),
  assigned_to: z.string().min(1, 'Custodian is required').max(255, 'Custodian name is too long'),
  condition: z.enum(['Excellent', 'Good', 'Needs Maintenance']),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  value: z.number().min(0, 'Value must be positive'),
});

type AssetFormValues = z.infer<typeof assetSchema>;

const pipelineSchema = z.object({
  pipeline_code: z.string().min(1, 'Pipeline code is required').max(50, 'Code is too long'),
  item: z.string().min(1, 'Item name is required').max(255, 'Item name is too long'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  supplier: z.string().min(1, 'Supplier is required').max(255, 'Supplier name is too long'),
  status: z.enum(['Processing', 'In Transit', 'Pending Approval', 'Delivered']),
  expected_date: z.string().min(1, 'Expected date is required'),
  project: z.string().min(1, 'Project destination is required').max(255, 'Project name is too long'),
  cost: z.number().min(0, 'Cost must be positive'),
});

type PipelineFormValues = z.infer<typeof pipelineSchema>;

export default function Logistics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const urlTab = searchParams.get('tab') as 'procurement' | 'assets' | null;
  const activeTab = urlTab || (highlightId ? 'assets' : 'procurement');

  const setActiveTab = (tab: 'procurement' | 'assets') => {
    const newParams: Record<string, string> = { tab };
    if (highlightId) {
      newParams.highlight = highlightId;
    }
    setSearchParams(newParams);
  };
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const claims = getUserClaims();
  const userRole = claims?.role?.toUpperCase();
  const isAuthorized = userRole === 'FIELD_OFFICER' || userRole === 'PROJECT_MANAGER' || userRole === 'ADMIN';

  // React Query: Get assets
  const { data: assets = [], isLoading: assetsLoading } = useQuery<AssetResponse[]>({
    queryKey: ['logistics-assets'],
    queryFn: async () => {
      const res = await api.get('/logistics/assets');
      return res.data;
    },
  });

  // React Query: Get pipelines
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery<PipelineResponse[]>({
    queryKey: ['logistics-pipelines'],
    queryFn: async () => {
      const res = await api.get('/logistics/pipelines');
      return res.data;
    },
  });

  // React Query Mutations: Create asset
  const createAssetMutation = useMutation({
    mutationFn: async (payload: AssetFormValues) => {
      const res = await api.post('/logistics/assets', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Asset registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['logistics-assets'] });
      setIsAssetModalOpen(false);
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data || err?.message || 'Failed to register asset';
      toast.error(errMsg);
    },
  });

  // React Query Mutations: Create pipeline
  const createPipelineMutation = useMutation({
    mutationFn: async (payload: PipelineFormValues) => {
      const res = await api.post('/logistics/pipelines', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Procurement pipeline added successfully!');
      queryClient.invalidateQueries({ queryKey: ['logistics-pipelines'] });
      setIsPipelineModalOpen(false);
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data || err?.message || 'Failed to add pipeline';
      toast.error(errMsg);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900/40';
      case 'In Transit':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-955/20 dark:text-blue-400 dark:border-blue-900/40';
      case 'Processing':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-450 dark:border-amber-900/40';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-750';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/20 dark:text-emerald-450';
      case 'Good':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-955/20 dark:text-blue-450';
      case 'Needs Maintenance':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-955/20 dark:text-amber-450';
      default:
        return 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-405';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] p-6 space-y-6 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span>Logistics Operations</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage NGO supply chains, procurement pipelines, and local field asset registers.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Tab Selector */}
          <div className="flex bg-slate-250/50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 w-fit shrink-0">
            <button
              onClick={() => setActiveTab('procurement')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'procurement'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Procurement Pipeline
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'assets'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              Asset Register
            </button>
          </div>

          {/* Registration Actions (Staff only) */}
          {isAuthorized && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsAssetModalOpen(true)}
                className="bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm px-5 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                + Register Asset
              </button>
              <button
                onClick={() => setIsPipelineModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                + Add Pipeline
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB CONTENT PANEL */}
      <div className="bg-white dark:bg-[#0B1220] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md p-6">
        {activeTab === 'procurement' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white font-sans">Active Pipelines</h2>
                <p className="text-xs text-slate-400 mt-0.5">Track orders and chemical/equipment supplies ordered for key NGO initiatives</p>
              </div>
            </div>

            {pipelinesLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                      <th className="py-4 px-2">Pipeline ID</th>
                      <th className="py-4 px-2">Item Name</th>
                      <th className="py-4 px-2">Quantity</th>
                      <th className="py-4 px-2">Project Destination</th>
                      <th className="py-4 px-2">Expected Arrival</th>
                      <th className="py-4 px-2">Est. Cost</th>
                      <th className="py-4 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {pipelines.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-2 font-mono text-xs font-bold text-slate-500">{p.pipeline_code}</td>
                        <td className="py-4 px-2 font-bold text-slate-900 dark:text-white">{p.item}</td>
                        <td className="py-4 px-2 font-semibold text-slate-655 dark:text-slate-350">{p.qty} pcs</td>
                        <td className="py-4 px-2 font-medium text-slate-655 dark:text-slate-350">{p.project}</td>
                        <td className="py-4 px-2 text-slate-505 dark:text-slate-400">
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.expected_date}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2 font-extrabold text-slate-900 dark:text-white">
                          ETB {Number(p.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {pipelines.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                          No active procurement pipelines found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white font-sans">Registered Assets</h2>
                <p className="text-xs text-slate-400 mt-0.5">Inventory list of field operational vehicles and tech equipment</p>
              </div>
            </div>

            {assetsLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                      <th className="py-4 px-2">Asset Code</th>
                      <th className="py-4 px-2">Asset Name</th>
                      <th className="py-4 px-2">Serial ID</th>
                      <th className="py-4 px-2">Current Location</th>
                      <th className="py-4 px-2">Custody / Custodian</th>
                      <th className="py-4 px-2">Condition</th>
                      <th className="py-4 px-2">Estimated Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {assets.map((a) => {
                      const isHighlighted = highlightId === a.id;
                      return (
                        <tr
                          key={a.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${
                            isHighlighted ? 'bg-blue-50/80 dark:bg-blue-950/20 font-semibold border-l-2 border-l-blue-500' : ''
                          }`}
                        >
                          <td className="py-4 px-2 font-mono text-xs font-bold text-slate-500">{a.asset_code}</td>
                          <td className="py-4 px-2 font-bold text-slate-900 dark:text-white">{a.name}</td>
                          <td className="py-4 px-2 font-semibold text-slate-655 dark:text-slate-355">{a.serial}</td>
                          <td className="py-4 px-2 font-medium text-slate-655 dark:text-slate-355">{a.location}</td>
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-655 dark:text-slate-355">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{a.assigned_to}</span>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${getConditionColor(a.condition)}`}>
                              {a.condition === 'Needs Maintenance' ? (
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                              ) : (
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              )}
                              {a.condition}
                            </span>
                          </td>
                          <td className="py-4 px-2 font-extrabold text-slate-900 dark:text-white">
                            ETB {Number(a.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    {assets.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                          No registered assets found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REGISTER ASSET MODAL */}
      {isAssetModalOpen && (
        <AssetModal onClose={() => setIsAssetModalOpen(false)} onSubmit={(data) => createAssetMutation.mutate(data)} isSubmitting={createAssetMutation.isPending} />
      )}

      {/* ADD PIPELINE MODAL */}
      {isPipelineModalOpen && (
        <PipelineModal onClose={() => setIsPipelineModalOpen(false)} onSubmit={(data) => createPipelineMutation.mutate(data)} isSubmitting={createPipelineMutation.isPending} />
      )}
    </div>
  );
}

// Modal Component for Asset Registration
function AssetModal({ onClose, onSubmit, isSubmitting }: { onClose: () => void; onSubmit: (values: AssetFormValues) => void; isSubmitting: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_code: '',
      name: '',
      serial: '',
      location: '',
      assigned_to: '',
      condition: 'Good',
      purchase_date: new Date().toISOString().split('T')[0],
      value: 0
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in font-sans p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Register New Asset</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Add details for operational field vehicles, machinery, or devices.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Asset Code</label>
              <input
                type="text"
                {...register('asset_code')}
                placeholder="e.g. AST-VE-045"
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.asset_code && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.asset_code.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Asset Name</label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Toyota Land Cruiser"
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Serial ID / Plate</label>
              <input
                type="text"
                {...register('serial')}
                placeholder="e.g. SR-993-X"
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.serial && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.serial.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Location</label>
              <input
                type="text"
                {...register('location')}
                placeholder="e.g. Gondar Warehouse B"
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.location && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.location.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Custodian / Owner</label>
              <input
                type="text"
                {...register('assigned_to')}
                placeholder="e.g. Ama Boateng"
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.assigned_to && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.assigned_to.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Condition</label>
              <select
                {...register('condition')}
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Needs Maintenance">Needs Maintenance</option>
              </select>
              {errors.condition && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.condition.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Purchase Date</label>
              <input
                type="date"
                {...register('purchase_date')}
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.purchase_date && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.purchase_date.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Value (ETB)</label>
              <input
                type="number"
                step="0.01"
                {...register('value', { valueAsNumber: true })}
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.value && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.value.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-lg transition-all duration-200 mt-4 disabled:opacity-50"
          >
            {isSubmitting ? 'Registering...' : 'Register Asset'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Modal Component for Procurement Pipeline Add
function PipelineModal({ onClose, onSubmit, isSubmitting }: { onClose: () => void; onSubmit: (values: PipelineFormValues) => void; isSubmitting: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<PipelineFormValues>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      pipeline_code: '',
      item: '',
      qty: 1,
      supplier: '',
      status: 'Processing',
      expected_date: new Date().toISOString().split('T')[0],
      project: '',
      cost: 0
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in font-sans p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Add Procurement Pipeline</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Register logistics pipeline item, quantity, destination and supplier details.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Pipeline Code</label>
              <input
                type="text"
                {...register('pipeline_code')}
                placeholder="e.g. PROC-2026-005"
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.pipeline_code && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.pipeline_code.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Item Name</label>
              <input
                type="text"
                {...register('item')}
                placeholder="e.g. Water Filters"
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.item && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.item.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Quantity</label>
              <input
                type="number"
                {...register('qty', { valueAsNumber: true })}
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.qty && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.qty.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Supplier</label>
              <input
                type="text"
                {...register('supplier')}
                placeholder="e.g. Nile Technologies"
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.supplier && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.supplier.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Project Destination</label>
              <input
                type="text"
                {...register('project')}
                placeholder="e.g. WASH Well Drilling Initiative"
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.project && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.project.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Status</label>
              <select
                {...register('status')}
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Processing">Processing</option>
                <option value="In Transit">In Transit</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Delivered">Delivered</option>
              </select>
              {errors.status && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.status.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Expected Date</label>
              <input
                type="date"
                {...register('expected_date')}
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.expected_date && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.expected_date.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Estimated Cost (ETB)</label>
              <input
                type="number"
                step="0.01"
                {...register('cost', { valueAsNumber: true })}
                className="w-full border border-slate-350 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.cost && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.cost.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-lg transition-all duration-200 mt-4 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Add Pipeline'}
          </button>
        </form>
      </div>
    </div>
  );
}
