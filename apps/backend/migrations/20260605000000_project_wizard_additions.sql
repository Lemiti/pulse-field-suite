-- apps/backend/migrations/20260605000000_project_wizard_additions.sql

-- 1. Add DRAFT to the project_status enum
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'DRAFT';

-- 2. Add new columns to projects table to support Step 2 and Step 3 details of the wizard
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS sector_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS risks_and_mitigations JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS assumptions TEXT,
ADD COLUMN IF NOT EXISTS outcomes_and_indicators JSONB NOT NULL DEFAULT '[]'::jsonb;
