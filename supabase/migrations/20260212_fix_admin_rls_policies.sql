-- Optimize RLS policies for performance by wrapping auth.jwt() in SELECT
-- This prevents re-evaluation for each row

-- status_incidents policies
DROP POLICY IF EXISTS "Admin update status_incidents" ON status_incidents;
CREATE POLICY "Admin update status_incidents" ON status_incidents FOR UPDATE 
USING (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

DROP POLICY IF EXISTS "Admin insert status_incidents" ON status_incidents;
CREATE POLICY "Admin insert status_incidents" ON status_incidents FOR INSERT 
WITH CHECK (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

DROP POLICY IF EXISTS "Admin delete status_incidents" ON status_incidents;
CREATE POLICY "Admin delete status_incidents" ON status_incidents FOR DELETE 
USING (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

-- status_incident_updates policies
DROP POLICY IF EXISTS "Admin update status_incident_updates" ON status_incident_updates;
CREATE POLICY "Admin update status_incident_updates" ON status_incident_updates FOR UPDATE 
USING (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

DROP POLICY IF EXISTS "Admin insert status_incident_updates" ON status_incident_updates;
CREATE POLICY "Admin insert status_incident_updates" ON status_incident_updates FOR INSERT 
WITH CHECK (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

DROP POLICY IF EXISTS "Admin delete status_incident_updates" ON status_incident_updates;
CREATE POLICY "Admin delete status_incident_updates" ON status_incident_updates FOR DELETE 
USING (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

-- status_components policies
DROP POLICY IF EXISTS "Admin update status_components" ON status_components;
CREATE POLICY "Admin update status_components" ON status_components FOR UPDATE 
USING (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

DROP POLICY IF EXISTS "Admin insert status_components" ON status_components;
CREATE POLICY "Admin insert status_components" ON status_components FOR INSERT 
WITH CHECK (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

DROP POLICY IF EXISTS "Admin delete status_components" ON status_components;
CREATE POLICY "Admin delete status_components" ON status_components FOR DELETE 
USING (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

-- status_component_incidents policies
DROP POLICY IF EXISTS "Admin update status_component_incidents" ON status_component_incidents;
CREATE POLICY "Admin update status_component_incidents" ON status_component_incidents FOR UPDATE 
USING (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

DROP POLICY IF EXISTS "Admin insert status_component_incidents" ON status_component_incidents;
CREATE POLICY "Admin insert status_component_incidents" ON status_component_incidents FOR INSERT 
WITH CHECK (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);

DROP POLICY IF EXISTS "Admin delete status_component_incidents" ON status_component_incidents;
CREATE POLICY "Admin delete status_component_incidents" ON status_component_incidents FOR DELETE 
USING (
    COALESCE(
        ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    ) = true
);
