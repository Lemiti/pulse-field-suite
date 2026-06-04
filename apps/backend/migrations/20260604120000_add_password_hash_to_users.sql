-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Update all existing seeded users with a bcrypt hash of 'password123'
-- This hash corresponds to "password123" encrypted via bcrypt
UPDATE users SET password_hash = '$2b$12$R9h/lIPtZk.G4IQ.1Mrc4u.Fp4P7C7u4oWzN7.ZkGz/qg7OqR5R6S';

-- Make it NOT NULL
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
