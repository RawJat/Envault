-- Fix the trim_incident_history trigger to bypass RLS
-- The trigger needs to run as a superuser function to delete old incidents

DROP TRIGGER IF EXISTS trigger_trim_incident_history ON status_incidents;
DROP FUNCTION IF EXISTS trim_incident_history();

-- Recreate the function without RLS restrictions
CREATE OR REPLACE FUNCTION trim_incident_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only run if the incident is marked as resolved
    IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
        -- Temporarily disable RLS for this operation
        DELETE FROM public.status_incidents
        WHERE id IN (
            SELECT id
            FROM public.status_incidents
            WHERE status = 'resolved'
            ORDER BY resolved_at DESC NULLS LAST
            OFFSET 15
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_trim_incident_history
    AFTER UPDATE ON status_incidents
    FOR EACH ROW
    EXECUTE FUNCTION trim_incident_history();

-- Also fix the set_incident_resolved_at function for consistency
DROP TRIGGER IF EXISTS trigger_set_incident_resolved_at ON status_incidents;
DROP FUNCTION IF EXISTS set_incident_resolved_at();

CREATE OR REPLACE FUNCTION set_incident_resolved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
        NEW.resolved_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_incident_resolved_at
    BEFORE UPDATE ON status_incidents
    FOR EACH ROW
    EXECUTE FUNCTION set_incident_resolved_at();
