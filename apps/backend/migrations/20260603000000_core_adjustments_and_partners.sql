-- apps/backend/migrations/20260603000000_core_adjustments_and_partners.sql

-- 1. Create the Focus Area Enum
CREATE TYPE project_focus_area AS ENUM (
    'EDUCATION', 
    'HEALTH', 
    'WASH', 
    'EMPOWERMENT', 
    'TRAFFICKING'
);

-- 2. Add Focus Area and Localized Geographic metadata to Projects
ALTER TABLE projects 
ADD COLUMN focus_area project_focus_area NOT NULL DEFAULT 'WASH',
ADD COLUMN location_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Create Partners Table (for global/funding partners)
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- e.g., 'GOVERNMENT', 'FOUNDATION', 'PRIVATE_DONOR'
    country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Project Partners Many-to-Many Join Table
CREATE TABLE project_partners (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    contribution_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, partner_id)
);
