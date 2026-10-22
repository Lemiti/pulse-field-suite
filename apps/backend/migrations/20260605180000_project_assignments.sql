-- apps/backend/migrations/20260605180000_project_assignments.sql

ALTER TABLE projects ADD COLUMN project_leader_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
