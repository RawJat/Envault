-- Add the slug column
ALTER TABLE projects ADD COLUMN slug text;

-- Create the unique constraint
ALTER TABLE projects ADD CONSTRAINT unique_user_id_slug UNIQUE (user_id, slug);

-- Note: We are not making slug NOT NULL yet. We will do that in a later migration 
-- after the backfill script successfully populates slugs for existing records.
