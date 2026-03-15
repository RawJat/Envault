-- Remove IP address tracking from audit logs
ALTER TABLE audit_logs DROP COLUMN ip_address;

-- Add indexes to support server-side filtering in the dashboard
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
