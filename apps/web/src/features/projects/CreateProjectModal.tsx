import { useState, useEffect, useRef } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import { getApiErrorMessage } from '../../lib/errors';
import { X, Loader2, Plus, Trash2, ArrowLeft, ArrowRight, Save, CloudLightning } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Leaflet default icon URL fixing for Vite
const markerIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Ethiopian Cascading Region -> Zone -> Woreda Dataset
const CASCADING_DATA: Record<string, Record<string, string[]>> = {
  Oromia: {
    'East Shewa': ["Ada'a", 'Lome'],
    Arsi: ['Munesa', 'Shirka'],
  },
  Amhara: {
    'North Gondar': ['Debarq', 'Lay Armachiho'],
    'South Wollo': ['Dessie Zuria', 'Kalu'],
  },
  Tigray: {
    'Eastern Tigray': ['Adigrat Zuria', 'Ganta Afeshum'],
    'Southern Tigray': ['Alaje', 'Endamehoni'],
  },
};

const WOREDA_COORDS: Record<string, [number, number]> = {
  "Ada'a": [8.9, 39.0],
  Lome: [8.8, 39.2],
  Munesa: [7.9, 39.1],
  Shirka: [7.8, 39.5],
  Debarq: [13.15, 37.9],
  'Lay Armachiho': [12.8, 37.4],
  'Dessie Zuria': [11.1, 39.6],
  Kalu: [11.0, 39.8],
  'Adigrat Zuria': [14.25, 39.45],
  'Ganta Afeshum': [14.28, 39.4],
  Alaje: [12.9, 39.5],
  Endamehoni: [12.8, 39.52],
};

const DONOR_OPTIONS = [
  'USAID',
  'Gates Foundation',
  'Private Trust',
  'Direct Donor',
];

const SECTOR_OPTIONS = [
  'Orphanage',
  'School',
];

const wizardSchema = z.object({
  name: z.string().min(1, 'Project title is required'),
  description: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  total_income: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().min(0, 'Must be positive').optional()),
  donor_name: z.string().min(1, 'Donor is required'),
  budget_allocated: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().min(0, 'Must be positive').optional()),
  
  sector_type: z.array(z.string()).min(1, 'Select at least one sector type'),
  region: z.string().min(1, 'Region is required'),
  zone: z.string().min(1, 'Zone is required'),
  woreda: z.string().min(1, 'Woreda is required'),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),

  assumptions: z.string().optional(),
  risks_and_mitigations: z.array(z.object({
    risk: z.string().min(1, 'Risk cannot be empty'),
    mitigation: z.string().min(1, 'Mitigation cannot be empty'),
  })),
  outcomes_and_indicators: z.array(z.object({
    outcome: z.string().min(1, 'Outcome cannot be empty'),
    indicator: z.string().min(1, 'Indicator cannot be empty'),
  })),
});

type WizardFormValues = z.infer<typeof wizardSchema>;

// Leaflet Map events controller helper
function MapController({ center, onClick }: { center: [number, number]; onClick: (latlng: L.LatLng) => void }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeCountryId } = useActiveCountry();

  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const methods = useForm<WizardFormValues>({
    resolver: zodResolver(wizardSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      total_income: 0,
      donor_name: '',
      budget_allocated: 0,
      sector_type: [],
      region: '',
      zone: '',
      woreda: '',
      latitude: null,
      longitude: null,
      assumptions: '',
      risks_and_mitigations: [{ risk: '', mitigation: '' }],
      outcomes_and_indicators: [{ outcome: '', indicator: '' }],
    },
    mode: 'onChange',
  });

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = methods;

  const { fields: riskFields, append: appendRisk, remove: removeRisk } = useFieldArray({
    control,
    name: 'risks_and_mitigations',
  });

  const { fields: outcomeFields, append: appendOutcome, remove: removeOutcome } = useFieldArray({
    control,
    name: 'outcomes_and_indicators',
  });

  // ============= STEP 1 AUTO-SAVE DEBOUNCE EFFECT =============
  const nameValue = watch('name');
  const descriptionValue = watch('description');
  const budgetValue = watch('budget_allocated');
  const startDateValue = watch('start_date');
  const endDateValue = watch('end_date');
  const totalIncomeValue = watch('total_income');
  const donorNameValue = watch('donor_name');

  useEffect(() => {
    if (!nameValue || nameValue.trim().length < 3) return;

    const timer = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        const payload = {
          name: nameValue,
          description: descriptionValue || null,
          budget_allocated: budgetValue ? Number(budgetValue) : 0,
          funding_sources: donorNameValue ? [donorNameValue] : [],
          focus_area: 'WASH',
          location_metadata: {},
          start_date: startDateValue || null,
          end_date: endDateValue || null,
          status: 'DRAFT',
          total_income: totalIncomeValue ? Number(totalIncomeValue) : 0,
          donor_name: donorNameValue || null,
        };

        if (draftIdRef.current) {
          await api.put(`/projects/${draftIdRef.current}`, payload);
        } else {
          const res = await api.post('/projects', payload);
          draftIdRef.current = res.data.id;
          setDraftId(res.data.id);
        }
        setAutoSaveStatus('saved');
      } catch (err) {
        console.error(err);
        setAutoSaveStatus('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [nameValue, descriptionValue, budgetValue, startDateValue, endDateValue, totalIncomeValue, donorNameValue]);

  // ============= STEP 2 CASCADING SELECTORS =============
  const regionValue = watch('region');
  const zoneValue = watch('zone');
  const woredaValue = watch('woreda');
  const woredaLat = watch('latitude');
  const woredaLng = watch('longitude');

  const [mapCenter, setMapCenter] = useState<[number, number]>([9.145, 40.4896]);

  // Reset zone & woreda when region changes
  const prevRegionRef = useRef(regionValue);
  useEffect(() => {
    if (prevRegionRef.current !== regionValue) {
      setValue('zone', '');
      setValue('woreda', '');
      setValue('latitude', null);
      setValue('longitude', null);
      prevRegionRef.current = regionValue;
    }
  }, [regionValue, setValue]);

  // Reset woreda when zone changes
  const prevZoneRef = useRef(zoneValue);
  useEffect(() => {
    if (prevZoneRef.current !== zoneValue) {
      setValue('woreda', '');
      setValue('latitude', null);
      setValue('longitude', null);
      prevZoneRef.current = zoneValue;
    }
  }, [zoneValue, setValue]);

  // Auto-center coordinates when woreda is picked
  useEffect(() => {
    if (woredaValue && WOREDA_COORDS[woredaValue]) {
      const coords = WOREDA_COORDS[woredaValue];
      setValue('latitude', coords[0]);
      setValue('longitude', coords[1]);
      setMapCenter(coords);
    }
  }, [woredaValue, setValue]);

  const handleMapClick = (latlng: L.LatLng) => {
    setValue('latitude', Number(latlng.lat.toFixed(6)));
    setValue('longitude', Number(latlng.lng.toFixed(6)));
  };

  // ============= FINALIZE MUTATION =============
  const finalizeMutation = useMutation({
    mutationFn: async (values: WizardFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || null,
        budget_allocated: values.budget_allocated ? Number(values.budget_allocated) : 0,
        funding_sources: values.donor_name ? [values.donor_name] : [],
        focus_area: 'WASH',
        location_metadata: {
          region: values.region,
          zone: values.zone,
          woreda: values.woreda,
          coordinates: { lat: values.latitude, lng: values.longitude },
        },
        start_date: values.start_date,
        end_date: values.end_date,
        status: 'PLANNING',
        sector_type: values.sector_type.join(', '),
        risks_and_mitigations: values.risks_and_mitigations,
        assumptions: values.assumptions || null,
        outcomes_and_indicators: values.outcomes_and_indicators,
        total_income: values.total_income ? Number(values.total_income) : 0,
        donor_name: values.donor_name,
      };

      const currentDraftId = draftId || draftIdRef.current;
      if (currentDraftId) {
        return await api.put(`/projects/${currentDraftId}`, payload);
      } else {
        return await api.post('/projects', payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects', activeCountryId] });
      onClose();
      navigate(`/projects/${res.data.id}?tab=Dashboard`);
    },
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Failed to complete project creation.'));
    },
  });

  const onSubmit = (values: WizardFormValues) => {
    finalizeMutation.mutate(values);
  };

  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) {
      fieldsToValidate = ['name', 'start_date', 'end_date', 'total_income', 'donor_name', 'budget_allocated'];
    } else if (step === 2) {
      fieldsToValidate = ['sector_type', 'region', 'zone', 'woreda'];
      if (woredaLat === null || woredaLng === null) {
        alert('Please drop a marker pin on the map');
        return;
      }
    }
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setStep((s) => s + 1);
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-[80vw] shadow-2xl max-h-[92vh] flex flex-col relative overflow-hidden">
        
        {/* HEADER & STEP TRACKER */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Project Creation Wizard
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Design and map your next field intervention in 3 simple steps
              </p>
            </div>
            
            {/* Auto Save State Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
              <CloudLightning className="w-3.5 h-3.5 text-blue-500" />
              {autoSaveStatus === 'idle' && 'Draft Idle'}
              {autoSaveStatus === 'saving' && 'Auto-saving Draft…'}
              {autoSaveStatus === 'saved' && 'Draft Saved'}
              {autoSaveStatus === 'error' && 'Auto-save failed'}
            </div>
          </div>

          {/* Stepper Steps UI */}
          <div className="flex items-center justify-between max-w-xl w-full mx-auto pt-2">
            {[1, 2, 3].map((num) => {
              const label = num === 1 ? 'Core Details' : num === 2 ? 'Location Mapping' : 'Risks & Outcomes';
              const active = step >= num;
              return (
                <div key={num} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step === num
                        ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                        : active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {num}
                  </div>
                  <span
                    className={`text-xs font-bold font-sans ${
                      active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {label}
                  </span>
                  {num < 3 && <div className="h-0.5 w-12 bg-slate-200 dark:bg-slate-850" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* FORM & STEP SLIDES */}
        <div className="overflow-y-auto flex-1 p-8">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
              
              {/* STEP 1: Core Details */}
              {step === 1 && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      {...methods.register('name')}
                      placeholder="e.g. Oromia Water Intervention 2026"
                      className={`w-full border rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                        errors.name ? 'border-red-500' : 'border-slate-350'
                      }`}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1 font-bold">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                      Project Description
                    </label>
                    <textarea
                      {...methods.register('description')}
                      placeholder="Provide background context for field officers..."
                      rows={3}
                      className="w-full border border-slate-350 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        {...methods.register('start_date')}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                          errors.start_date ? 'border-red-500' : 'border-slate-350'
                        }`}
                      />
                      {errors.start_date && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{errors.start_date.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                        End Date *
                      </label>
                      <input
                        type="date"
                        {...methods.register('end_date')}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                          errors.end_date ? 'border-red-500' : 'border-slate-350'
                        }`}
                      />
                      {errors.end_date && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{errors.end_date.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                        Total Income (USD)
                      </label>
                      <input
                        type="number"
                        {...methods.register('total_income')}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                          errors.total_income ? 'border-red-500' : 'border-slate-350'
                        }`}
                      />
                      {errors.total_income && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{errors.total_income.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                        Donor Name *
                      </label>
                      <select
                        {...methods.register('donor_name')}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                          errors.donor_name ? 'border-red-500' : 'border-slate-350'
                        }`}
                      >
                        <option value="">Select donor...</option>
                        {DONOR_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {errors.donor_name && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{errors.donor_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                        Allocated Budget (USD)
                      </label>
                      <input
                        type="number"
                        {...methods.register('budget_allocated')}
                        className={`w-full border rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                          errors.budget_allocated ? 'border-red-500' : 'border-slate-350'
                        }`}
                      />
                      {errors.budget_allocated && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{errors.budget_allocated.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Location Mapping */}
              {step === 2 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  
                  {/* SECTOR TYPES */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 font-sans">
                      Sector Types *
                    </label>
                    <div className="flex gap-4 flex-wrap">
                      {SECTOR_OPTIONS.map((sector) => {
                        const currentSectors = watch('sector_type') || [];
                        const checked = currentSectors.includes(sector);
                        return (
                          <label
                            key={sector}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer select-none transition-all ${
                              checked
                                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/30 dark:border-blue-500 dark:text-blue-350 font-bold'
                                : 'border-slate-250 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              className="hidden"
                              onChange={() => {
                                const next = checked
                                  ? currentSectors.filter((s) => s !== sector)
                                  : [...currentSectors, sector];
                                setValue('sector_type', next, { shouldValidate: true });
                              }}
                            />
                            {sector}
                          </label>
                        );
                      })}
                    </div>
                    {errors.sector_type && (
                      <p className="text-red-500 text-xs mt-1 font-bold">{errors.sector_type.message}</p>
                    )}
                  </div>

                  {/* CASCADING REGION SELECTORS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                        Region *
                      </label>
                      <select
                        {...methods.register('region')}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="">Select Region...</option>
                        {Object.keys(CASCADING_DATA).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {errors.region && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{errors.region.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                        Zone *
                      </label>
                      <select
                        {...methods.register('zone')}
                        disabled={!regionValue}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                      >
                        <option value="">Select Zone...</option>
                        {regionValue &&
                          CASCADING_DATA[regionValue] &&
                          Object.keys(CASCADING_DATA[regionValue]).map((z) => (
                            <option key={z} value={z}>
                              {z}
                            </option>
                          ))}
                      </select>
                      {errors.zone && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{errors.zone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                        Woreda *
                      </label>
                      <select
                        {...methods.register('woreda')}
                        disabled={!zoneValue}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                      >
                        <option value="">Select Woreda...</option>
                        {regionValue &&
                          zoneValue &&
                          CASCADING_DATA[regionValue]?.[zoneValue] &&
                          CASCADING_DATA[regionValue][zoneValue].map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                      </select>
                      {errors.woreda && (
                        <p className="text-red-500 text-xs mt-1 font-bold">{errors.woreda.message}</p>
                      )}
                    </div>
                  </div>

                  {/* INTERACTIVE LEAFLET MAP CONTAINER */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest font-sans">
                      Geographic Pin Coordinates (Click map to drop pin)
                    </label>
                    <div className="h-72 w-full rounded-2xl overflow-hidden border border-slate-250 dark:border-slate-800 z-0">
                      <MapContainer center={mapCenter} zoom={7} scrollWheelZoom={true} className="h-full w-full">
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapController center={mapCenter} onClick={handleMapClick} />
                        {woredaLat !== null && woredaLng !== null && (
                          <Marker position={[woredaLat, woredaLng]} icon={markerIcon} />
                        )}
                      </MapContainer>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Latitude</span>
                        <input
                          type="text"
                          readOnly
                          value={woredaLat ?? ''}
                          placeholder="Latitude not set"
                          className="mt-1 w-full text-xs font-mono px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-350 dark:border-slate-800 outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Longitude</span>
                        <input
                          type="text"
                          readOnly
                          value={woredaLng ?? ''}
                          placeholder="Longitude not set"
                          className="mt-1 w-full text-xs font-mono px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-350 dark:border-slate-800 outline-none"
                        />
                      </div>
                    </div>
                    {(errors.latitude || errors.longitude) && (
                      <p className="text-red-500 text-xs font-bold">Please drop a marker pin on the map to define coordinates</p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Risks & Outcomes */}
              {step === 3 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  
                  {/* ASSUMPTIONS TEXT AREA */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-sans">
                      Core Assumptions
                    </label>
                    <textarea
                      {...methods.register('assumptions')}
                      placeholder="e.g. Local authority support is secured; no extreme weather disruptions..."
                      rows={3}
                      className="w-full border border-slate-350 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>

                  {/* RISKS & MITIGATION ARRAY */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-2">
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest font-sans">
                        Risks & Mitigation Strategies
                      </label>
                      <button
                        type="button"
                        onClick={() => appendRisk({ risk: '', mitigation: '' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </button>
                    </div>

                    {riskFields.map((field, idx) => (
                      <div key={field.id} className="flex gap-4 items-center bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Risk description"
                            {...methods.register(`risks_and_mitigations.${idx}.risk`)}
                            className="w-full text-xs px-3 py-2 border dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Mitigation action"
                            {...methods.register(`risks_and_mitigations.${idx}.mitigation`)}
                            className="w-full text-xs px-3 py-2 border dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRisk(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* OUTCOMES & INDICATORS ARRAY */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-2">
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest font-sans">
                        Outcomes & Performance Indicators
                      </label>
                      <button
                        type="button"
                        onClick={() => appendOutcome({ outcome: '', indicator: '' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </button>
                    </div>

                    {outcomeFields.map((field, idx) => (
                      <div key={field.id} className="flex gap-4 items-center bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Outcomes (e.g. increase wash access)"
                            {...methods.register(`outcomes_and_indicators.${idx}.outcome`)}
                            className="w-full text-xs px-3 py-2 border dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Indicators (e.g. 5 wells built)"
                            {...methods.register(`outcomes_and_indicators.${idx}.indicator`)}
                            className="w-full text-xs px-3 py-2 border dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOutcome(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </FormProvider>
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between z-10">
          
          {/* Prominent Back/Cancel Button at Bottom-Left */}
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBackStep}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-750 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors font-bold text-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to cancel and exit? Any unsaved changes will be lost.')) {
                    onClose();
                    navigate('/projects');
                  }
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors font-bold text-xs cursor-pointer animate-fade-in"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Next/Finish Navigation Buttons at Bottom-Right */}
          <div className="flex items-center gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={finalizeMutation.isPending}
                onClick={handleSubmit(onSubmit as any)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {finalizeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finalizing…</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Finish</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
