/** Tenant countries — IDs must match `countries` rows in Postgres seed/migrations. */
export const TENANT_COUNTRIES = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Ghana' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Namibia' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Ethiopia' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Uganda' },
  { id: '00000000-0000-0000-0000-000000000005', name: 'Kenya' },
] as const;


export const DEFAULT_COUNTRY_ID = TENANT_COUNTRIES[0].id;
