-- Mock login personas (must exist for FK: audit_logs, project_messages, media)
INSERT INTO users (id, country_id, name, email, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'HQ Admin', 'admin@ngo.org', 'ADMIN'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Project Manager', 'pm@ngo.org', 'PROJECT_MANAGER'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Donor Viewer', 'donor@ngo.org', 'DONOR')
ON CONFLICT (id) DO NOTHING;
