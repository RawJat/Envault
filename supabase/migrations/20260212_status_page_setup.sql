-- Create ENUMs (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'component_status') THEN
        CREATE TYPE component_status AS ENUM ('operational', 'degraded', 'outage', 'maintenance');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_severity') THEN
        CREATE TYPE incident_severity AS ENUM ('minor', 'major', 'critical', 'maintenance');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
        CREATE TYPE incident_status AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');
    END IF;
END
$$;

-- Create status_components table
CREATE TABLE IF NOT EXISTS status_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    group_name TEXT,
    status component_status NOT NULL DEFAULT 'operational',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create status_incidents table
CREATE TABLE IF NOT EXISTS status_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    severity incident_severity NOT NULL DEFAULT 'minor',
    status incident_status NOT NULL DEFAULT 'investigating',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create status_incident_updates table
CREATE TABLE IF NOT EXISTS status_incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES status_incidents(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status incident_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create junction table
CREATE TABLE IF NOT EXISTS status_component_incidents (
    component_id UUID NOT NULL REFERENCES status_components(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES status_incidents(id) ON DELETE CASCADE,
    PRIMARY KEY (component_id, incident_id)
);

-- Create Indexes for Foreign Keys (Performance)
CREATE INDEX IF NOT EXISTS idx_status_incident_updates_incident_id ON status_incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_status_component_incidents_incident_id ON status_component_incidents(incident_id);

-- Enable RLS
ALTER TABLE status_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_component_incidents ENABLE ROW LEVEL SECURITY;

-- Public Read Access
DROP POLICY IF EXISTS "Public read access for status_components" ON status_components;
CREATE POLICY "Public read access for status_components" ON status_components FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for status_incidents" ON status_incidents;
CREATE POLICY "Public read access for status_incidents" ON status_incidents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for status_incident_updates" ON status_incident_updates;
CREATE POLICY "Public read access for status_incident_updates" ON status_incident_updates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for status_component_incidents" ON status_component_incidents;
CREATE POLICY "Public read access for status_component_incidents" ON status_component_incidents FOR SELECT USING (true);

-- Admin Write Access (checks 'is_admin' in app_metadata)
-- Split into INSERT/UPDATE/DELETE to avoid "Multiple Permissive Policies" warning on SELECT
-- Wrapped auth.jwt() in (select ...) to avoid "Auth RLS Init Plan" warning

-- status_components
DROP POLICY IF EXISTS "Admin write access for status_components" ON status_components; -- Cleanup old policy
DROP POLICY IF EXISTS "Admin insert status_components" ON status_components;
CREATE POLICY "Admin insert status_components" ON status_components FOR INSERT WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);
DROP POLICY IF EXISTS "Admin update status_components" ON status_components;
CREATE POLICY "Admin update status_components" ON status_components FOR UPDATE USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);
DROP POLICY IF EXISTS "Admin delete status_components" ON status_components;
CREATE POLICY "Admin delete status_components" ON status_components FOR DELETE USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);

-- status_incidents
DROP POLICY IF EXISTS "Admin write access for status_incidents" ON status_incidents; -- Cleanup old policy
DROP POLICY IF EXISTS "Admin insert status_incidents" ON status_incidents;
CREATE POLICY "Admin insert status_incidents" ON status_incidents FOR INSERT WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);
DROP POLICY IF EXISTS "Admin update status_incidents" ON status_incidents;
CREATE POLICY "Admin update status_incidents" ON status_incidents FOR UPDATE USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);
DROP POLICY IF EXISTS "Admin delete status_incidents" ON status_incidents;
CREATE POLICY "Admin delete status_incidents" ON status_incidents FOR DELETE USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);

-- status_incident_updates
DROP POLICY IF EXISTS "Admin write access for status_incident_updates" ON status_incident_updates; -- Cleanup old policy
DROP POLICY IF EXISTS "Admin insert status_incident_updates" ON status_incident_updates;
CREATE POLICY "Admin insert status_incident_updates" ON status_incident_updates FOR INSERT WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);
DROP POLICY IF EXISTS "Admin update status_incident_updates" ON status_incident_updates;
CREATE POLICY "Admin update status_incident_updates" ON status_incident_updates FOR UPDATE USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);
DROP POLICY IF EXISTS "Admin delete status_incident_updates" ON status_incident_updates;
CREATE POLICY "Admin delete status_incident_updates" ON status_incident_updates FOR DELETE USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);

-- status_component_incidents
DROP POLICY IF EXISTS "Admin write access for status_component_incidents" ON status_component_incidents; -- Cleanup old policy
DROP POLICY IF EXISTS "Admin insert status_component_incidents" ON status_component_incidents;
CREATE POLICY "Admin insert status_component_incidents" ON status_component_incidents FOR INSERT WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);
DROP POLICY IF EXISTS "Admin update status_component_incidents" ON status_component_incidents;
CREATE POLICY "Admin update status_component_incidents" ON status_component_incidents FOR UPDATE USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);
DROP POLICY IF EXISTS "Admin delete status_component_incidents" ON status_component_incidents;
CREATE POLICY "Admin delete status_component_incidents" ON status_component_incidents FOR DELETE USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true
);

-- Trigger: Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_status_components_updated_at ON status_components;
CREATE TRIGGER update_status_components_updated_at
    BEFORE UPDATE ON status_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_status_incidents_updated_at ON status_incidents;
CREATE TRIGGER update_status_incidents_updated_at
    BEFORE UPDATE ON status_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-set resolved_at
CREATE OR REPLACE FUNCTION set_incident_resolved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
        NEW.resolved_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_incident_resolved_at ON status_incidents;
CREATE TRIGGER trigger_set_incident_resolved_at
    BEFORE UPDATE ON status_incidents
    FOR EACH ROW
    EXECUTE FUNCTION set_incident_resolved_at();

-- Trigger: Data Retention (Keep last 15 resolved incidents)
CREATE OR REPLACE FUNCTION trim_incident_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only run if the incident is marked as resolved
    IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
        DELETE FROM status_incidents
        WHERE id IN (
            SELECT id
            FROM status_incidents
            WHERE status = 'resolved'
            ORDER BY resolved_at DESC
            OFFSET 15
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_trim_incident_history ON status_incidents;
CREATE TRIGGER trigger_trim_incident_history
    AFTER UPDATE ON status_incidents
    FOR EACH ROW
    EXECUTE FUNCTION trim_incident_history();
