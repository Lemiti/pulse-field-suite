import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Dialog } from '../../components/ui/Dialog';
import { TENANT_COUNTRIES } from '../../lib/countries';
import type { Partner, CreatePartnerRequest, UpdatePartnerRequest } from '@pulse/shared-types';
import { 
  Plus, 
  Search, 
  Handshake, 
  Globe, 
  Building2, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  Briefcase, 
  Info,
  Check
} from 'lucide-react';

export default function Partners() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('Donor');
  const [countryId, setCountryId] = useState<string>(''); // empty string represents Global / null

  // Fetch partners
  const { data: partners = [], isLoading, error } = useQuery<Partner[]>({
    queryKey: ['partners'],
    queryFn: async () => {
      const res = await api.get('/partners');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Create partner mutation
  const createMutation = useMutation({
    mutationFn: async (newPartner: CreatePartnerRequest) => {
      const res = await api.post('/partners', newPartner);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      closeDialog();
    }
  });

  // Update partner mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePartnerRequest }) => {
      const res = await api.put(`/partners/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      closeDialog();
    }
  });

  // Delete partner mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/partners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    }
  });

  const openAddDialog = () => {
    setEditingPartner(null);
    setName('');
    setType('Donor');
    setCountryId('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (partner: Partner) => {
    setEditingPartner(partner);
    setName(partner.name);
    setType(partner.type);
    setCountryId(partner.country_id || '');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingPartner(null);
    setName('');
    setType('Donor');
    setCountryId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type.trim()) return;

    const payload = {
      name: name.trim(),
      type: type.trim(),
      country_id: countryId || null,
    };

    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this partner? This will remove their association from all projects.')) {
      deleteMutation.mutate(id);
    }
  };

  // Filter partners based on search
  const filteredPartners = partners.filter(partner => 
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to get country name by ID
  const getCountryName = (cId: string | null) => {
    if (!cId) return 'Global / Multi-Country';
    const c = TENANT_COUNTRIES.find(tc => tc.id === cId);
    return c ? c.name : 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
        <span className="text-sm font-bold text-slate-500 animate-pulse">Loading partners directory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg max-w-2xl mx-auto shadow-md space-y-4">
        <h3 className="font-extrabold text-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          Error Loading Partners
        </h3>
        <p className="text-sm">Failed to connect to the backend server. Please make sure the backend services are running.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in font-sans pb-12">
      {/* ============= PAGE HEADER ============= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Handshake className="w-9 h-9 text-[#1273DE]" />
            Partners & Funders
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Manage NGO funding partners, donors, local government connections, and project sponsorships.
          </p>
        </div>
        
        <button
          onClick={openAddDialog}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-[#1273DE] hover:bg-[#0F60BA] text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {/* ============= FILTER & SEARCH BAR ============= */}
      <div className="bg-white dark:bg-[#0B1220] border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search partners by name or type (e.g. Donor, Local Gov)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#1273DE]/30 focus:border-[#1273DE] transition-all"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 px-3 py-2.5 rounded-lg">
          Showing <span className="font-extrabold text-[#1273DE]">{filteredPartners.length}</span> partners
        </div>
      </div>

      {/* ============= PARTNERS GRID/LIST ============= */}
      {filteredPartners.length === 0 ? (
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200/80 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/60 dark:border-slate-800">
            <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-550" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No partners found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">
            {searchTerm ? "No partners match your search query. Try typing something else." : "Get started by adding your first funding partner or organization using the button above."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Partner Details</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Operating Jurisdiction</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {filteredPartners.map((partner) => (
                <tr 
                  key={partner.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#F1F7FF] dark:bg-blue-950/40 text-[#1273DE] flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-blue-100 dark:ring-blue-900/30">
                        {partner.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="block font-bold text-slate-900 dark:text-white text-base">
                          {partner.name}
                        </span>
                        <span className="block text-[10px] text-slate-405 uppercase tracking-wider font-extrabold mt-0.5">
                          ID: {partner.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#137333] dark:bg-green-955/30 dark:text-green-400 border border-green-200/30">
                      <Briefcase className="w-3.5 h-3.5" />
                      {partner.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <Globe className="w-4 h-4 text-slate-450 dark:text-slate-500" />
                      {getCountryName(partner.country_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEditDialog(partner)}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-[#1273DE] hover:bg-[#F1F7FF] dark:text-slate-400 dark:hover:text-blue-450 dark:hover:bg-slate-900 transition-colors"
                      title="Edit partner info"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(partner.id)}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-red-655 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-slate-900 transition-colors"
                      title="Delete partner"
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

      {/* ============= ADD/EDIT DIALOG ============= */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingPartner ? 'Edit Partner Details' : 'Add New Partner'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-sans">
              Partner Organization Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. USAID, Bill & Melinda Gates Foundation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1273DE]/30 focus:border-[#1273DE]"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-505 dark:text-slate-400 uppercase tracking-wider mb-1 font-sans">
              Partner Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg overflow-hidden border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1273DE]/30 focus:border-[#1273DE]"
            >
              <option value="Donor">Donor</option>
              <option value="Local Gov">Local Gov</option>
              <option value="Government">Government</option>
              <option value="Foundation">Foundation</option>
              <option value="Corporate Sponsor">Corporate Sponsor</option>
              <option value="International NGO">International NGO</option>
              <option value="Private Donor">Private Donor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-505 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-sans">
              Operating Jurisdiction
              <span className="group relative cursor-pointer text-slate-450">
                <Info className="w-3.5 h-3.5" />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] p-2 rounded shadow-md w-48 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  Limit to specific country tenant or keep global.
                </span>
              </span>
            </label>
            <select
              value={countryId}
              onChange={(e) => setCountryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg overflow-hidden border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1273DE]/30 focus:border-[#1273DE]"
            >
              <option value="">Global / Multi-Country</option>
              {TENANT_COUNTRIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeDialog}
              className="px-4 py-2 border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-350 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1273DE] hover:bg-[#0F60BA] text-white text-sm font-bold rounded-lg disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {editingPartner ? 'Save Changes' : 'Create Partner'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
