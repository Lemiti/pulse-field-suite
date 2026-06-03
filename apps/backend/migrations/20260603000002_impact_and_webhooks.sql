-- apps/backend/migrations/20260603000002_impact_and_webhooks.sql

-- 1. Create Global Metric Templates (e.g. tracking Wells, Schools, Surgeries)
CREATE TABLE global_metric_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'WELLS_INSTALLED', 'SURGERIES_COMPLETED'
    display_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Project-specific Impact Metrics
CREATE TABLE project_impact_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    metric_template_id UUID NOT NULL REFERENCES global_metric_templates(id) ON DELETE CASCADE,
    target_value INT NOT NULL DEFAULT 0,
    current_value INT NOT NULL DEFAULT 0,
    is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, metric_template_id)
);

-- 3. Add budget warning tracking state to projects table
ALTER TABLE projects 
ADD COLUMN budget_warning_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Create the Webhook Delivery Queue (for robust retry logic)
CREATE TABLE webhook_delivery_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'FAILED', 'SUCCESS'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── SEED: Default ENA Metric Templates ────────────────────────────────────────
INSERT INTO global_metric_templates (code, display_name, unit) VALUES
  ('WELLS_INSTALLED', 'Water Wells Installed', 'wells'),
  ('SCHOOLS_CONSTRUCTED', 'Schools Constructed', 'schools'),
  ('HEALTH_POSTS_CONSTRUCTED', 'Health Posts Built', 'posts'),
  ('CATARACT_SURGERIES', 'Cataract Surgeries Completed', 'surgeries'),
  ('TRAFFICKING_PREVENTED', 'Trafficking Prevention Audiences Reach', 'people')
ON CONFLICT (code) DO NOTHING;
