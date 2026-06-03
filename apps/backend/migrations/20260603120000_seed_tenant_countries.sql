-- Additional tenant countries for login selector (Ghana already seeded)
INSERT INTO countries (id, name, currency_code) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Namibia', 'NAD'),
  ('00000000-0000-0000-0000-000000000003', 'Ethiopia', 'ETB'),
  ('00000000-0000-0000-0000-000000000004', 'Uganda', 'UGX')
ON CONFLICT (id) DO NOTHING;
