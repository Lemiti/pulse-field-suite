-- apps/backend/migrations/20260605000100_project_wizard_income_donor.sql

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS total_income DECIMAL(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS donor_name VARCHAR(255);
