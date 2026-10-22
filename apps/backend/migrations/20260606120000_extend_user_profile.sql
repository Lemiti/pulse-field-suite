-- apps/backend/migrations/20260606120000_extend_user_profile.sql

ALTER TABLE users ADD COLUMN phone VARCHAR(50);
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN focus_area VARCHAR(255);
ALTER TABLE users ADD COLUMN job_title VARCHAR(255);
ALTER TABLE users ADD COLUMN avatar_url TEXT;
