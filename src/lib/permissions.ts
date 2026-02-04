import { SupabaseClient } from '@supabase/supabase-js'
import { cacheGet, cacheSet, CacheKeys, CACHE_TTL } from './cache'

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
    // Check cache first
    const cacheKey = CacheKeys.userProjectRole(userId, projectId)
    const cachedRole = await cacheGet<ProjectRole>(cacheKey)

    if (cachedRole !== null) {
        return cachedRole
    }

    // 1. Check if Owner
    const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single()

    if (project && project.user_id === userId) {
        await cacheSet(cacheKey, 'owner', CACHE_TTL.PROJECT_ROLE)
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
        const role = member.role as ProjectRole
        await cacheSet(cacheKey, role, CACHE_TTL.PROJECT_ROLE)
        return role
    }

    // Cache null result to avoid repeated DB queries for non-members
    await cacheSet(cacheKey, null, CACHE_TTL.PROJECT_ROLE)
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
    // Check cache first
    const cacheKey = CacheKeys.userSecretAccess(userId, secretId)
    const cachedAccess = await cacheGet<{ hasAccess: boolean; role: ProjectRole }>(cacheKey)

    if (cachedAccess !== null) {
        return cachedAccess
    }

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

    if (!secret) {
        const noAccess = { hasAccess: false, role: null }
        await cacheSet(cacheKey, noAccess, CACHE_TTL.SECRET_ACCESS)
        return noAccess
    }

    const projectOwnerId = (secret.projects as any).user_id

    // 2. Check Project Owner
    if (projectOwnerId === userId) {
        const ownerAccess = { hasAccess: true, role: 'owner' as ProjectRole }
        await cacheSet(cacheKey, ownerAccess, CACHE_TTL.SECRET_ACCESS)
        return ownerAccess
    }

    // 3. Check Project Member
    const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', secret.project_id)
        .eq('user_id', userId)
        .single()

    if (member) {
        const memberAccess = { hasAccess: true, role: member.role as ProjectRole }
        await cacheSet(cacheKey, memberAccess, CACHE_TTL.SECRET_ACCESS)
        return memberAccess
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
        const shareAccess = { hasAccess: true, role: 'viewer' as ProjectRole }
        await cacheSet(cacheKey, shareAccess, CACHE_TTL.SECRET_ACCESS)
        return shareAccess
    }

    const noAccess = { hasAccess: false, role: null }
    await cacheSet(cacheKey, noAccess, CACHE_TTL.SECRET_ACCESS)
    return noAccess
}
