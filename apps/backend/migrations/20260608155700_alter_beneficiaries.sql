-- Alter beneficiaries table to add source_project_id foreign key constraint
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES projects(id);
