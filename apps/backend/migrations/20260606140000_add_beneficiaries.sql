-- apps/backend/migrations/20260606140000_add_beneficiaries.sql

CREATE TABLE IF NOT EXISTS beneficiaries (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(255) NOT NULL,
    zone VARCHAR(255) NOT NULL,
    woreda VARCHAR(255) NOT NULL,
    focus_area VARCHAR(255) NOT NULL,
    household_size INT NOT NULL DEFAULT 1,
    contact VARCHAR(50) NOT NULL,
    registration_date VARCHAR(50) NOT NULL,
    has_duplicate_warning BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_details TEXT,
    age INT NOT NULL,
    needs TEXT,
    project_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_pending BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed beneficiaries
INSERT INTO beneficiaries (id, name, region, zone, woreda, focus_area, household_size, contact, registration_date, has_duplicate_warning, duplicate_details, age, needs, project_ids, is_pending)
VALUES
('BEN-GD-890', 'Abera Ketema', 'Amhara', 'North Gondar', 'Debarq', 'WASH (Clean Water access)', 6, '+251 91 123 4567', '2026-02-14', TRUE, 'An individual named ''Abera Ketema'' was registered in Dabat Woreda on 2026-01-10. Please cross-reference government IDs.', 34, 'Requires primary water supply access and sanitation kit delivery.', '[]'::jsonb, FALSE),
('BEN-GD-891', 'Zenebech Bekele', 'Amhara', 'North Gondar', 'Lay Armachiho', 'Vocational Education', 4, '+251 92 345 6789', '2026-03-20', FALSE, NULL, 28, 'Enrolled in tailoring and small business management course cohort.', '[]'::jsonb, FALSE),
('BEN-GD-892', 'Mulugeta Tesfaye', 'Amhara', 'North Gondar', 'Debarq', 'WASH (Borehole irrigation)', 7, '+251 90 987 6543', '2026-04-02', FALSE, NULL, 45, 'Receives agricultural irrigation tools and solar water pump maintenance training.', '[]'::jsonb, FALSE),
('BEN-GD-893', 'Tigist Assefa', 'Amhara', 'North Gondar', 'Debarq', 'Health & Pediatric Bed Allocation', 3, '+251 95 456 7890', '2026-05-11', TRUE, 'Same contact number (+251 95 456 7890) matches ''Tigist Assefa'' in Gondar City clinic database.', 23, 'Requires maternal health checkups and infant care bedding support.', '[]'::jsonb, FALSE),
('BEN-GD-894', 'Kassa Worku', 'Amhara', 'North Gondar', 'Lay Armachiho', 'Vocational Education', 5, '+251 91 654 3210', '2026-05-30', FALSE, NULL, 19, 'Enrolled in masonry and carpentry technical training workshops.', '[]'::jsonb, FALSE),
-- Seed pending ones
('PEND-01', 'Tadesse Mengesha', 'Amhara', 'North Gondar', 'Debarq', 'WASH (Clean Water access)', 5, '+251 91 789 0123', '2026-06-05', FALSE, NULL, 42, 'Requires immediate distribution of family sanitation kits.', '[]'::jsonb, TRUE),
('PEND-02', 'Aster Tolossa', 'Amhara', 'North Gondar', 'Lay Armachiho', 'Vocational Education', 2, '+251 92 890 1234', '2026-06-05', TRUE, 'Aster Tolossa is flagged for potential duplication in Debark administrative register.', 31, 'Seeking admission to textile training courses.', '[]'::jsonb, TRUE)
ON CONFLICT (id) DO NOTHING;
