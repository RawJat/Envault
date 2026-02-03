import { SupabaseClient } from '@supabase/supabase-js'

export type ProjectRole = 'owner' | 'editor' | 'viewer' | null

/**
 * Checks the user's role in a specific project.
 * Returns: 'owner', 'editor', 'viewer', or null (no access).
 */
export async function getProjectRole(
    supabase: SupabaseClient,
    projectId: string,
    userId: string
): Promise<ProjectRole> {
    // 1. Check if Owner
    const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single()

    if (project && project.user_id === userId) {
        return 'owner'
    }

    // 2. Check if Member
    const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single()

    if (member) {
        return member.role as ProjectRole
    }

    return null
}

/**
 * Verifies if a user has access to a specific secret.
 * Checks: Project Ownership OR Project Membership OR Granular Share.
 */
export async function canAccessSecret(
    supabase: SupabaseClient,
    secretId: string,
    userId: string
): Promise<{ hasAccess: boolean; role: ProjectRole }> {
    // 1. Fetch Secret & Project info
    const { data: secret } = await supabase
        .from('secrets')
        .select(`
            id,
            project_id,
            projects!inner (user_id)
        `)
        .eq('id', secretId)
        .single()

    if (!secret) return { hasAccess: false, role: null }

    const projectOwnerId = (secret.projects as any).user_id

    // 2. Check Project Owner
    if (projectOwnerId === userId) {
        return { hasAccess: true, role: 'owner' }
    }

    // 3. Check Project Member
    const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', secret.project_id)
        .eq('user_id', userId)
        .single()

    if (member) {
        return { hasAccess: true, role: member.role as ProjectRole }
    }

    // 4. Check Granular Secret Share
    const { data: share } = await supabase
        .from('secret_shares')
        .select('role')
        .eq('secret_id', secretId)
        .eq('user_id', userId)
        .single()

    if (share) {
        // Map granular 'viewer' to general viewer role or distinct type if needed
        return { hasAccess: true, role: 'viewer' }
    }

    return { hasAccess: false, role: null }
}
