-- Add GitHub App integration fields to projects table
ALTER TABLE projects
ADD COLUMN github_installation_id BIGINT,
ADD COLUMN github_repo_full_name TEXT;

-- Add an index for faster lookups when verifying access
CREATE INDEX idx_projects_github_installation_id ON projects(github_installation_id);
