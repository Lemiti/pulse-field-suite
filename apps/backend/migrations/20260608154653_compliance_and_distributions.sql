-- Add compliance and distribution tables
CREATE TABLE IF NOT EXISTS beneficiary_dependents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_id VARCHAR(50) NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    age INT NOT NULL,
    vulnerability_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS distribution_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_id VARCHAR(50) NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    issued_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Alter assets table to support quantity tracking for distributions
ALTER TABLE assets ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 100;

-- Update specific assets to have customized starting quantities
UPDATE assets SET quantity = 5 WHERE asset_code = 'AST-EQ-092';
UPDATE assets SET quantity = 12 WHERE asset_code = 'AST-VE-041';
UPDATE assets SET quantity = 3 WHERE asset_code = 'AST-EQ-112';
UPDATE assets SET quantity = 50 WHERE asset_code = 'AST-EQ-154';

-- Seed dependents for the existing seeded beneficiaries
INSERT INTO beneficiary_dependents (beneficiary_id, age, vulnerability_notes) VALUES
('BEN-GD-890', 8, 'Malnourishment monitoring'),
('BEN-GD-890', 12, 'School age child'),
('BEN-GD-890', 4, 'Infant care required'),
('BEN-GD-891', 6, 'Requires vaccination'),
('BEN-GD-892', 15, 'Working age helper'),
('BEN-GD-892', 10, 'Requires educational supplies'),
('BEN-GD-893', 1, 'Infant care required')
ON CONFLICT DO NOTHING;
