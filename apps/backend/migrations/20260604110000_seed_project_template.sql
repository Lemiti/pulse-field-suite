-- Insert a project template
INSERT INTO projects (
    id, country_id, name, description, budget_allocated, budget_spent, status, funding_sources, focus_area, is_template
)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    '00000000-0000-0000-0000-000000000001',
    'Clean Water Infrastructure Template',
    'Standard blueprint for establishing community boreholes, solar purification systems, and local distribution lines.',
    250000.00,
    0.00,
    'PLANNING',
    '["Global Fund", "UNICEF"]'::jsonb,
    'WASH',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Insert phases for the template project
INSERT INTO phases (id, project_id, name, sort_order)
VALUES 
    ('88888888-8888-8888-8888-000000000001', '88888888-8888-8888-8888-888888888888', 'Phase 1: Feasibility & Procurement', 1),
    ('88888888-8888-8888-8888-000000000002', '88888888-8888-8888-8888-888888888888', 'Phase 2: Execution & Commissioning', 2)
ON CONFLICT (id) DO NOTHING;

-- Insert tasks for the template project
INSERT INTO tasks (id, project_id, phase_id, assigned_to, name, status, start_date, end_date)
VALUES
    ('88888888-8888-8888-8888-100000000001', '88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-000000000001', NULL, 'Conduct Geological Surveying', 'PLAN', '2026-07-01', '2026-07-10'),
    ('88888888-8888-8888-8888-100000000002', '88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-000000000001', NULL, 'Acquire Local Government Permits', 'PLAN', '2026-07-11', '2026-07-20'),
    ('88888888-8888-8888-8888-100000000003', '88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-000000000002', NULL, 'Borehole Drilling and Casing', 'PLAN', '2026-07-21', '2026-08-05'),
    ('88888888-8888-8888-8888-100000000004', '88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-000000000002', NULL, 'Install Solar Pump and Storage Tank', 'PLAN', '2026-08-06', '2026-08-15'),
    ('88888888-8888-8888-8888-100000000005', '88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-000000000002', NULL, 'Water Quality Testing & Community Handover', 'PLAN', '2026-08-16', '2026-08-20')
ON CONFLICT (id) DO NOTHING;
