import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, User, Building2, ToggleRight, Database, Cloud, RefreshCw, AlertCircle, Check, Play, Terminal, Eye, EyeOff, Upload, Phone, Briefcase, Target, FileText, Mail, Globe, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WebhookDeliveryQueueItem, UpdateProfileRequest } from '@pulse/shared-types';
import { toast } from 'sonner';

/**
 * JWT Payload structure (decoded from token)
 */
interface DecodedJWT {
  sub: string;
  country_id: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

/**
 * Lightweight Base64 decoder - decodes JWT payload without external libraries
 * Safely handles padding and encoding edge cases
 */
function decodeBase64(str: string): string {
  try {
    // Add padding if needed
    let padded = str;
    switch (str.length % 4) {
      case 2:
        padded += '==';
        break;
      case 3:
        padded += '=';
        break;
    }
    // Replace URL-safe characters
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    // Use browser's atob
    return decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    console.error('Base64 decode failed:', e);
    return '';
  }
}

/**
 * Decode JWT from token string
 * Safely parses the payload segment without validation
 */
function decodeJWT(token: string): DecodedJWT | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadStr = decodeBase64(parts[1]);
    const payload = JSON.parse(payloadStr);
    return payload;
  } catch (e) {
    console.error('JWT decode failed:', e);
    return null;
  }
}

/**
 * Settings Component
 *
 * Workspace configuration panel with JWT-based profile display,
 * security settings, and workspace preferences.
 *
 * Features:
 * - JWT decoding from localStorage with native Base64
 * - User profile display (name, role, tenant context)
 * - Tab-based navigation (Profile, Security, Workspace)
 * - Placeholder configuration toggles
 * - WCAG AAA compliance with 48x48px touch targets
 * - Light/dark mode support
 */
export default function Settings() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'Profile';

  // ============= JWT DECODING =============
  const decodedUser = useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const decoded = decodeJWT(token);
    return decoded;
  }, []);

  // ============= RENDER =============
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-sans select-none">
      {/* ============= PAGE HEADER ============= */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Manage your profile, security, and workspace preferences
          </p>
        </div>
      </div>

      {/* ============= TAB CONTENT ============= */}
      {activeTab === 'Profile' && <ProfileTab user={decodedUser} />}
      {activeTab === 'Security' && <SecurityTab />}
      {activeTab === 'Workspace' && <WorkspaceTab />}
      {activeTab === 'Developer' && <DeveloperTab />}

      {/* Fallback for unknown tabs */}
      {activeTab !== 'Profile' && activeTab !== 'Security' && activeTab !== 'Workspace' && activeTab !== 'Developer' && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            Content for tab "{activeTab}" not yet available.
          </p>
        </div>
      )}
    </div>
  );
}

// ============= PROFILE TAB =============
interface ProfileTabProps {
  user: DecodedJWT | null;
}

/**
 * Displays user profile information with edit, avatar upload, and field validations:
 * - Full name (from token claims, editable)
 * - Role authority badge (non-editable)
 * - Tenant (country) context (non-editable)
 * - Job Title, Core Sector Focus, Phone Number, Bio (editable)
 * - Avatar profile photo (uploadable, stores as Base64)
 */
function ProfileTab({ user }: ProfileTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: meData, isLoading } = useQuery({
    queryKey: ['users-me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    focus_area: '',
    job_title: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (meData) {
      setFormData({
        name: meData.name || '',
        phone: meData.phone || '',
        bio: meData.bio || '',
        focus_area: meData.focus_area || '',
        job_title: meData.job_title || '',
        avatar_url: meData.avatar_url || '',
      });
    }
  }, [meData]);

  if (!user) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-8 border border-amber-200 dark:border-amber-800">
        <p className="text-amber-900 dark:text-amber-200 font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> No active token found. Please log in again.
        </p>
      </div>
    );
  }

  const userId = user.sub || 'Unknown';
  const countryId = user.country_id || 'Unknown';
  const email = meData?.email || user.email || 'N/A';
  const role = meData?.role || user.role || 'USER';
  const countryName = meData?.country_name || 'N/A';
  const issuedAt = user.iat ? new Date(user.iat * 1000).toLocaleDateString() : 'Unknown';
  const expiresAt = user.exp ? new Date(user.exp * 1000).toLocaleDateString() : 'Unknown';

  const cleanOptionalField = (value: string | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: UpdateProfileRequest) => {
      // Use PUT to perform a full object overwrite on the /users/me endpoint
      // and skip global toast to use custom local error handling
      const res = await api.put('/users/me', payload, { skipGlobalToast: true } as any);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['users-me'], data);
      queryClient.invalidateQueries({ queryKey: ['users-me'] });
      toast.success('NGO Profile updated successfully!');
      setIsEditing(false);
    },
    onError: (err: any) => {
      console.error(err);
      
      const status = err.response?.status;
      if (status === 405) {
        toast.dismiss();
        toast.error('System configuration error: Please contact IT support.');
        return;
      }
      
      if (status >= 400 && status < 500) {
        toast.dismiss();
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Validation error occurred.';
        toast.error(errorMsg);
        return;
      }
      
      toast.dismiss();
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to update profile details.';
      toast.error(errorMsg);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.dismiss();
      toast.error('Full Name is required.');
      return;
    }
    setIsSubmitting(true);
    updateProfileMutation.mutate({
      name: formData.name.trim(),
      phone: cleanOptionalField(formData.phone),
      bio: cleanOptionalField(formData.bio),
      focus_area: cleanOptionalField(formData.focus_area),
      job_title: cleanOptionalField(formData.job_title),
      avatar_url: cleanOptionalField(formData.avatar_url),
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.dismiss();
      toast.error('Profile photo must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      setFormData(prev => ({ ...prev, avatar_url: base64Str }));
      
      // Auto-save the avatar
      setIsSubmitting(true);
      updateProfileMutation.mutate({
        name: formData.name.trim(),
        phone: cleanOptionalField(formData.phone),
        bio: cleanOptionalField(formData.bio),
        focus_area: cleanOptionalField(formData.focus_area),
        job_title: cleanOptionalField(formData.job_title),
        avatar_url: base64Str,
      });
      toast.success('Avatar uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getRoleBadgeStyle = (role: string): { bg: string; text: string; label: string } => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return {
          bg: 'bg-red-105 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40',
          text: 'text-red-900 dark:text-red-300',
          label: 'Administrator',
        };
      case 'PROJECT_MANAGER':
        return {
          bg: 'bg-blue-105 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/40',
          text: 'text-blue-900 dark:text-blue-300',
          label: 'Project Manager',
        };
      case 'FIELD_OFFICER':
        return {
          bg: 'bg-emerald-105 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/40',
          text: 'text-emerald-900 dark:text-emerald-300',
          label: 'Field Officer',
        };
      case 'DONOR':
        return {
          bg: 'bg-purple-105 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40',
          text: 'text-purple-900 dark:text-purple-300',
          label: 'Donor',
        };
      default:
        return {
          bg: 'bg-slate-105 dark:bg-slate-750 border border-slate-200 dark:border-slate-600',
          text: 'text-slate-900 dark:text-slate-200',
          label: role,
        };
    }
  };

  const roleBadge = getRoleBadgeStyle(role);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-60 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-60 col-span-2 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const nameInitials = formData.name
    ? formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const sectorFocusOptions = [
    { value: 'WASH', label: 'WASH (Water, Sanitation & Hygiene)' },
    { value: 'Health & Nutrition', label: 'Health & Nutrition' },
    { value: 'Food Security & Livelihoods', label: 'Food Security & Livelihoods' },
    { value: 'Education & Child Protection', label: 'Education & Child Protection' },
    { value: 'Logistics & Supply Chain', label: 'Logistics & Supply Chain' },
    { value: 'Shelter & Infrastructure', label: 'Shelter & Infrastructure' },
    { value: 'Policy & Administration', label: 'Policy & Administration' },
    { value: 'General Development', label: 'General Development' }
  ];

  return (
    <div className="space-y-6 select-text">
      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & NGO role summary info */}
        <div className="bg-white dark:bg-[#0B1220] rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center space-y-6 shadow-md dark:shadow-none">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold transition-transform duration-300 group-hover:scale-105">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{nameInitials}</span>
              )}
            </div>
            
            <button
              onClick={triggerFileInput}
              type="button"
              className="absolute bottom-0 right-0 p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-2 border-white dark:border-slate-800 hover:scale-110 transition-all cursor-pointer"
              title="Upload new profile picture"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {formData.name || 'User Profile'}
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              {formData.job_title || 'NGO Team Member'}
            </p>
          </div>

          <div className={`px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase ${roleBadge.bg} ${roleBadge.text} shadow-sm`}>
            {roleBadge.label}
          </div>

          <hr className="w-full border-slate-100 dark:border-slate-800" />

          <div className="w-full space-y-4 text-left">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-slate-400" /> Country Scope:
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{countryName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Target className="w-4 h-4 text-slate-400" /> Core Focus:
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formData.focus_area || 'General'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" /> Email:
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 break-all text-right">{email}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Fields Form */}
        <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#0B1220] rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-md dark:shadow-none flex flex-col justify-between">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  NGO Staff Profile
                  <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Manage your public humanitarian directory representation.
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  isEditing 
                    ? 'border-slate-350 text-slate-750 bg-slate-50 dark:border-slate-700 dark:text-slate-205 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700' 
                    : 'border-blue-650 text-blue-650 bg-transparent dark:border-blue-500 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20'
                }`}
              >
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3 rounded-lg border border-slate-250 bg-white dark:border-slate-800 dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Phone input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. +251 911 223 344"
                      className="w-full px-4 py-3 rounded-lg border border-slate-250 bg-white dark:border-slate-800 dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Job Title input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={formData.job_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                      placeholder="e.g. WASH Project Coordinator"
                      className="w-full px-4 py-3 rounded-lg border border-slate-250 bg-white dark:border-slate-800 dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Focus Area Select */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Core Sector Focus
                    </label>
                    <select
                      value={formData.focus_area}
                      onChange={(e) => setFormData(prev => ({ ...prev, focus_area: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-250 bg-white dark:border-slate-800 dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Select Sector...</option>
                      {sectorFocusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bio text area */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Bio & Mission Statement
                  </label>
                  <textarea
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Describe your role, background, or humanitarian focus..."
                    className="w-full px-4 py-3 rounded-lg border border-slate-250 bg-white dark:border-slate-800 dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-slate-350 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || updateProfileMutation.isPending}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    {(isSubmitting || updateProfileMutation.isPending) && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save NGO Profile
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Display grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/45 rounded-lg text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Phone Number
                      </p>
                      <p className="text-slate-900 dark:text-white font-semibold mt-1">
                        {formData.phone || 'No phone number provided'}
                      </p>
                    </div>
                  </div>

                  {/* Core focus */}
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/45 rounded-lg text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Core Sector Focus
                      </p>
                      <p className="text-slate-900 dark:text-white font-semibold mt-1">
                        {formData.focus_area || 'General NGO Operations'}
                      </p>
                    </div>
                  </div>

                  {/* Region Scope */}
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/45 rounded-lg text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Assigned Region/Scope
                      </p>
                      <p className="text-slate-900 dark:text-white font-semibold mt-1">
                        {countryName} (Scoped Tenant)
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/45 rounded-lg text-purple-600 dark:text-purple-400 mt-0.5 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Registered Email
                      </p>
                      <p className="text-slate-900 dark:text-white font-semibold mt-1 break-all">
                        {email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Biography */}
                <div className="flex items-start gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3 bg-slate-55 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-450 mt-0.5 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Biography / Mission Statement
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium mt-2 leading-relaxed whitespace-pre-wrap">
                      {formData.bio || 'This team member has not written a bio yet. Click "Edit Profile" to define your bio and mission statement.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
                  <span>Session Issued: <strong>{issuedAt}</strong></span>
                  <span>Session Expires: <strong>{expiresAt}</strong></span>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// ============= SECURITY TAB =============
/**
 * Placeholder security settings with configuration toggles
 */
function SecurityTab() {
  const [settings, setSettings] = useState({
    twoFactor: false,
    sessionTimeout: true,
    apiKeys: false,
  });

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setMessage({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data) {
        setMessage({
          type: 'error',
          text: typeof err.response.data === 'string' ? err.response.data : 'Failed to update password.',
        });
      } else {
        setMessage({ type: 'error', text: 'Network connection issue.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const securityOptions = [
    {
      id: 'twoFactor',
      name: 'Two-Factor Authentication',
      description: 'Require a second verification method for login',
      icon: Lock,
    },
    {
      id: 'sessionTimeout',
      name: 'Session Timeout',
      description: 'Auto-logout after 30 minutes of inactivity',
      icon: Lock,
    },
    {
      id: 'apiKeys',
      name: 'API Key Management',
      description: 'Manage and rotate API keys for integrations',
      icon: Lock,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <p className="text-blue-900 dark:text-blue-200 text-sm">
          Security settings help protect your account and organization data. Changes to these settings
          take effect immediately.
        </p>
      </div>

      <div className="space-y-4">
        {securityOptions.map((option) => (
          <div
            key={option.id}
            className="flex items-center justify-between p-4 rounded-lg border-0 dark:border dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[60px] shadow-md dark:shadow-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSettings({
                  ...settings,
                  [option.id]: !settings[option.id as keyof typeof settings],
                });
              }
            }}
            onClick={() => {
              setSettings({
                ...settings,
                [option.id]: !settings[option.id as keyof typeof settings],
              });
            }}
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">{option.name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{option.description}</p>
            </div>
            <button
              className={`flex-shrink-0 ml-4 w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                settings[option.id as keyof typeof settings]
                  ? 'bg-emerald-600 dark:bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-pressed={settings[option.id as keyof typeof settings]}
              aria-label={`Toggle ${option.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setSettings({
                  ...settings,
                  [option.id]: !settings[option.id as keyof typeof settings],
                });
              }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings[option.id as keyof typeof settings] ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border-0 dark:border dark:border-slate-800 rounded-xl p-6 shadow-md dark:shadow-none space-y-6">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Change Account Password</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Update your account credentials. You will stay signed in.
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-xs font-bold ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border border-red-500 text-red-500'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Current Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500/50 text-white font-extrabold text-xs transition-colors cursor-pointer shadow-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============= WORKSPACE TAB =============
/**
 * Placeholder workspace settings with configuration toggles
 */
function WorkspaceTab() {
  const [settings, setSettings] = useState({
    offlineSync: true,
    autoBackup: true,
    cacheLocal: true,
  });

  const workspaceOptions = [
    {
      id: 'offlineSync',
      name: 'Enable Offline Background Sync',
      description:
        'Allow the app to sync data when network connectivity is restored (for field officers)',
      icon: Cloud,
    },
    {
      id: 'autoBackup',
      name: 'Automatic Backup',
      description: 'Daily backup of project data to secure cloud storage',
      icon: Cloud,
    },
    {
      id: 'cacheLocal',
      name: 'Local Database Cache',
      description: 'Clear local SQLite cache to free up storage (will resync on next load)',
      icon: Database,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 border-0 dark:border dark:border-slate-700 shadow-md dark:shadow-none">
        <p className="text-slate-700 dark:text-slate-300 text-sm">
          Workspace settings apply to all users in your tenant. You must be an Administrator to modify
          these settings.
        </p>
      </div>

      <div className="space-y-4">
        {workspaceOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <div
              key={option.id}
              className="flex items-center justify-between p-4 rounded-lg border-0 dark:border dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[60px] shadow-md dark:shadow-none"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSettings({
                    ...settings,
                    [option.id]: !settings[option.id as keyof typeof settings],
                  });
                }
              }}
              onClick={() => {
                setSettings({
                  ...settings,
                  [option.id]: !settings[option.id as keyof typeof settings],
                });
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <IconComponent className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{option.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
              <button
                className={`flex-shrink-0 ml-4 w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  settings[option.id as keyof typeof settings]
                    ? 'bg-emerald-600 dark:bg-emerald-500'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
                aria-pressed={settings[option.id as keyof typeof settings]}
                aria-label={`Toggle ${option.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSettings({
                    ...settings,
                    [option.id]: !settings[option.id as keyof typeof settings],
                  });
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings[option.id as keyof typeof settings] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* ============= DANGER ZONE ============= */}
      <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Danger Zone
        </h3>
        <button className="w-full px-4 py-3 rounded-lg border-2 border-red-600 dark:border-red-500 text-red-700 dark:text-red-300 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors min-h-[48px] text-sm">
          Clear All Local Cache and Resync
        </button>
      </div>
    </div>
  );
}

// ============= DEVELOPER TAB =============
function DeveloperTab() {
  const queryClient = useQueryClient();
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(null);

  // Fetch webhooks using useQuery
  const { data: webhooks = [], isLoading, error, refetch } = useQuery<WebhookDeliveryQueueItem[]>({
    queryKey: ['developer-webhooks'],
    queryFn: async () => {
      const res = await api.get<WebhookDeliveryQueueItem[]>('/developer/webhooks');
      return res.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds for live status updates!
  });

  // Mutation to retry a webhook
  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/developer/webhooks/${id}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer-webhooks'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Success
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
            Pending
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-8 border border-slate-700 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Terminal className="w-48 h-48" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full bg-blue-600/30 flex items-center justify-center border border-blue-500/50">
            <Database className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Developer Settings</h2>
            <p className="text-slate-400 text-sm mt-1">
              Admin panel for monitoring webhook dispatches, processing state, and manual queue management.
            </p>
          </div>
        </div>
      </div>

      {/* Webhooks Queue Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border-0 dark:border dark:border-slate-800 shadow-md dark:shadow-none overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Outbound Webhook Delivery Queue</h3>
            <p className="text-xs text-slate-500 mt-1">Shows all webhooks, retry attempts, and status. Automatically refreshes.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            Loading webhook queue...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-500">
            Failed to load webhooks: {(error as any).message || 'Unknown error'}
          </div>
        ) : webhooks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No webhooks recorded in the delivery queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {webhooks.map((item) => {
              const eventType = item.payload?.event_type || 'unknown.event';
              const isExpanded = expandedWebhookId === item.id;
              
              return (
                <div key={item.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Status & Event Header */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(item.status)}
                        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                          {eventType}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <div>
                          <span className="font-semibold text-slate-600 dark:text-slate-400">ID:</span>{' '}
                          <span className="font-mono">{item.id}</span>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                          <span>
                            <strong>Attempts:</strong> {item.retry_count} / 5
                          </span>
                          {item.created_at && (
                            <span>
                              <strong>Created:</strong> {new Date(item.created_at).toLocaleString()}
                            </span>
                          )}
                          {item.next_attempt_at && item.status === 'PENDING' && (
                            <span>
                              <strong>Next Attempt:</strong> {new Date(item.next_attempt_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedWebhookId(isExpanded ? null : item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            Hide Payload
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            View Payload
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => retryMutation.mutate(item.id)}
                        disabled={retryMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    </div>
                  </div>

                  {/* Expanded Payload Viewer */}
                  {isExpanded && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                      <pre>{JSON.stringify(item.payload, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
