-- Cleanup failed or stuck jobs from previous attempts
DELETE FROM key_rotation_jobs 
WHERE status IN ('pending', 'processing', 'failed');

-- Cleanup orphaned keys that were created but never activated (status 'migrating')
DELETE FROM encryption_keys 
WHERE status = 'migrating';

-- Optional: Identify which keys are effectively orphaned (no secrets use them) but marked as 'retired'
-- This is safer to do manually or with a more complex query, so we stick to the safe deletions above.
