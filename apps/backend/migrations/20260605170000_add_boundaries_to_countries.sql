-- apps/backend/migrations/20260605170000_add_boundaries_to_countries.sql
ALTER TABLE countries ADD COLUMN IF NOT EXISTS administrative_boundaries JSONB;
