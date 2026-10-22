-- apps/backend/migrations/20260606130000_add_logistics.sql

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    serial VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    assigned_to VARCHAR(255) NOT NULL,
    condition VARCHAR(50) NOT NULL DEFAULT 'Good',
    purchase_date DATE NOT NULL,
    value NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create procurement_pipelines table
CREATE TABLE IF NOT EXISTS procurement_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_code VARCHAR(50) NOT NULL UNIQUE,
    item VARCHAR(255) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    supplier VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Processing',
    expected_date DATE NOT NULL,
    project VARCHAR(255) NOT NULL,
    cost NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed assets
INSERT INTO assets (asset_code, name, serial, location, assigned_to, condition, purchase_date, value) VALUES
('AST-EQ-092', 'Borehole Drilling Rig (Heavy Duty)', 'DR-8902-XL', 'Gondar Warehouse A', 'Kweku Mensah', 'Excellent', '2024-03-15', 8500000.00),
('AST-VE-041', 'Toyota Hilux 4x4 (Field Ops)', 'TH-2024-ETH-01', 'North Gondar Field Station', 'Ama Boateng', 'Good', '2024-06-10', 4200000.00),
('AST-EQ-112', 'Solar Powered Generator 50kW', 'SG-50-2025', 'Woreda Training Center', 'Nana Agyei', 'Needs Maintenance', '2025-01-20', 1800000.00),
('AST-EQ-154', 'Portable Water Testing Kit (Digital)', 'WTK-DIGI-882', 'North Gondar Field Station', 'Abena Owusu', 'Excellent', '2025-11-04', 120000.00)
ON CONFLICT (asset_code) DO NOTHING;

-- Seed procurement pipelines
INSERT INTO procurement_pipelines (pipeline_code, item, qty, supplier, status, expected_date, project, cost) VALUES
('PROC-2026-001', 'Solar Submersible Pumps', 15, 'Nile Water Technologies', 'In Transit', '2026-07-12', 'North Gondar Water & WASH Initiative', 1240000.00),
('PROC-2026-002', 'Pediatric Hospital Beds', 40, 'Addis Medical Equipment', 'Pending Approval', '2026-08-05', 'Primary Ward Refurbishment', 890000.00),
('PROC-2026-003', 'Vocational Toolkits & Lathes', 25, 'Global Skill Supplies', 'Delivered', '2026-05-28', 'Woreda Vocational Training', 450000.00),
('PROC-2026-004', 'Water Purification Chemicals', 120, 'Ethiopian Chemical Corp', 'Processing', '2026-06-25', 'Clean Water Treatment Hub', 310000.00)
ON CONFLICT (pipeline_code) DO NOTHING;
