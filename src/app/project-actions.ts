'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProject(name: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { checkReauthRequired } = await import('@/lib/auth-check')
    if (await checkReauthRequired(supabase)) {
        return { error: 'REAUTH_REQUIRED' }
    }

    const { data, error } = await supabase
        .from('projects')
        .insert({
            user_id: user.id,
            name,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating project:', error)
        return { error: error.message }
    }

    // Invalidate user's project list cache
    const { cacheDel, CacheKeys } = await import('@/lib/cache')
    await cacheDel(CacheKeys.userProjects(user.id))

    revalidatePath('/dashboard')
    return { data }
}

export async function getProjects(bypassCache: boolean = false) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Check cache first
    const { cacheGet, cacheSet, CacheKeys, CACHE_TTL } = await import('@/lib/cache')
    const cacheKey = CacheKeys.userProjects(user.id)

    if (!bypassCache) {
        const cachedProjects = await cacheGet<any[]>(cacheKey)
        if (cachedProjects !== null) {
            // Stale check: if first project uses old snake_case or missing createdAt
            const isStale = cachedProjects.length > 0 && (!cachedProjects[0].createdAt || 'created_at' in cachedProjects[0] || 'secrets' in cachedProjects[0]);
            if (!isStale) {
                return { data: cachedProjects }
            }
        }
    }

    // Step 1: Fetch projects only
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return { error: error.message }
    }

    if (!projects || projects.length === 0) {
        await cacheSet(cacheKey, [], CACHE_TTL.PROJECT_LIST)
        return { data: [] }
    }

    // Step 1.5: Fetch projects with shared secrets for this user
    // First, get project IDs that have shared secrets
    const { data: sharedProjectIdsData } = await supabase
        .from('secret_shares')
        .select('secrets!inner(project_id)')
        .eq('user_id', user.id)

    const sharedProjectIds = [...new Set(sharedProjectIdsData?.map(s => (s.secrets as any).project_id) || [])]

    // Fetch shared projects
    let sharedProjects: any[] = []
    if (sharedProjectIds.length > 0) {
        const { data: sharedProjs } = await supabase
            .from('projects')
            .select('*')
            .in('id', sharedProjectIds)
        sharedProjects = sharedProjs || []
    }

    // Add shared projects that aren't already in the projects list
    const allProjects = [...projects]
    sharedProjects.forEach(sharedProject => {
        if (!projects.find(p => p.id === sharedProject.id)) {
            allProjects.push(sharedProject)
        }
    })

    // Step 2: Fetch secrets count for each project
    const projectIds = allProjects.map(p => p.id)
    const { data: secretCounts, error: countError } = await supabase
        .from('secrets')
        .select('id, project_id')
        .in('project_id', projectIds)

    // Create a count map
    const secretCountMap = new Map<string, number>()
    secretCounts?.forEach(s => {
        secretCountMap.set(s.project_id, (secretCountMap.get(s.project_id) || 0) + 1)
    })

    // Step 3: Fetch project members for current user
    const { data: memberships, error: memberError } = await supabase
        .from('project_members')
        .select('project_id, role')
        .in('project_id', projectIds)
        .eq('user_id', user.id)

    // Create membership map
    const membershipMap = new Map(memberships?.map(m => [m.project_id, m.role]) || [])

    // Step 3.5: Check if projects are shared (for owners)
    // Fetch all members for owned projects
    const ownedProjectIds = allProjects.filter(p => p.user_id === user.id).map(p => p.id)
    let sharedStatusMap = new Map<string, boolean>()

    if (ownedProjectIds.length > 0) {
        // Check for project members
        const { data: allMembers } = await supabase
            .from('project_members')
            .select('project_id')
            .in('project_id', ownedProjectIds)

        // Check for shared secrets
        const { data: sharedSecrets } = await supabase
            .from('secret_shares')
            .select('secrets!inner(project_id)')
            .in('secrets.project_id', ownedProjectIds)

        // Mark projects as shared if they have members or shared secrets
        ownedProjectIds.forEach(projectId => {
            const hasMembers = allMembers?.some(m => m.project_id === projectId) || false
            const hasSharedSecrets = sharedSecrets?.some(s => (s.secrets as any).project_id === projectId) || false
            sharedStatusMap.set(projectId, hasMembers || hasSharedSecrets)
        })
    }

    // Step 4: Enrich projects with the data
    const enrichedProjects = allProjects.map((p) => {
        let role: 'owner' | 'editor' | 'viewer' = 'viewer'
        if (p.user_id === user.id) {
            role = 'owner'
        } else if (membershipMap.has(p.id)) {
            role = (membershipMap.get(p.id) as 'owner' | 'editor' | 'viewer') || 'viewer'
        }

        const count = secretCountMap.get(p.id) || 0
        const isShared = sharedStatusMap.get(p.id) || false

        return {
            id: p.id,
            name: p.name,
            user_id: p.user_id,
            createdAt: p.created_at || new Date().toISOString(), // Fallback for safety
            secretCount: count,
            variables: [],
            role,
            isShared
        }
    })

    // Cache the enriched projects
    await cacheSet(cacheKey, enrichedProjects, CACHE_TTL.PROJECT_LIST)

    return { data: enrichedProjects }
}

export async function deleteProject(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { checkReauthRequired } = await import('@/lib/auth-check')
    if (await checkReauthRequired(supabase)) {
        return { error: 'REAUTH_REQUIRED' }
    }

    // Permission Check: Owner Only
    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, id, user.id)

    if (role !== 'owner') {
        return { error: 'Unauthorized: Only the owner can delete a project.' }
    }

    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
    // We rely on RLS and the permission check above. 
    // strictly ensuring only ID match is fine if we validated ownership.

    if (error) {
        return { error: error.message }
    }

    // Invalidate caches for owner and all members
    const { cacheDel, CacheKeys, invalidateProjectCaches } = await import('@/lib/cache')
    await cacheDel(CacheKeys.userProjects(user.id))
    await invalidateProjectCaches(id) // Clear all project-specific caches

    revalidatePath('/dashboard')
    return { success: true }
}

export async function addVariable(projectId: string, key: string, value: string, isSecret: boolean = true) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { checkReauthRequired } = await import('@/lib/auth-check')
    if (await checkReauthRequired(supabase)) {
        return { error: 'REAUTH_REQUIRED' }
    }

    // Permission Check: Owner or Editor
    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, projectId, user.id)

    if (role !== 'owner' && role !== 'editor') {
        return { error: 'Unauthorized: You do not have permission to add variables.' }
    }

    // Import encryption utility
    const { encrypt } = await import('@/lib/encryption')

    // Encrypt the value before storing
    const encryptedValue = await encrypt(value)

    // Extract key_id from encrypted format: v1:key_id:ciphertext
    const keyId = encryptedValue.split(':')[1]

    const { data, error } = await supabase
        .from('secrets')
        .insert({
            user_id: user.id, // Creator
            project_id: projectId,
            key,
            value: encryptedValue,
            key_id: keyId,
            is_secret: isSecret,
            last_updated_by: user.id,
            last_updated_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding variable:', error)
        return { error: error.message }
    }

    revalidatePath(`/project/${projectId}`)
    return { data }
}

export async function updateVariable(id: string, projectId: string, updates: { key?: string; value?: string; is_secret?: boolean }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { checkReauthRequired } = await import('@/lib/auth-check')
    if (await checkReauthRequired(supabase)) {
        return { error: 'REAUTH_REQUIRED' }
    }

    // Permission Check: Owner or Editor
    // Note: Technically we should check if they can access THIS specific secret too? 
    // `getProjectRole` covers project-level access. 
    // If we support Granular Shares having "Edit" rights (unlikely? usually Read Only), we'd check that here.
    // For now, only Project Editors/Owners can update.
    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, projectId, user.id)

    if (role !== 'owner' && role !== 'editor') {
        return { error: 'Unauthorized: You do not have permission to update variables.' }
    }

    // If updating the value, encrypt it first
    const finalUpdates: Record<string, unknown> = {
        ...updates,
        last_updated_by: user.id,
        last_updated_at: new Date().toISOString()
    }

    if (updates.value) {
        const { encrypt } = await import('@/lib/encryption')
        finalUpdates.value = await encrypt(updates.value)
        // Extract key_id
        finalUpdates.key_id = (finalUpdates.value as string).split(':')[1]
    }

    const { error } = await supabase
        .from('secrets')
        .update(finalUpdates)
        .eq('id', id)
    // Remove .eq('user_id') because editors can update secrets they didn't create

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/project/${projectId}`)
    return { success: true }
}

export async function deleteVariable(id: string, projectId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { checkReauthRequired } = await import('@/lib/auth-check')
    if (await checkReauthRequired(supabase)) {
        return { error: 'REAUTH_REQUIRED' }
    }

    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, projectId, user.id)

    if (role !== 'owner' && role !== 'editor') {
        return { error: 'Unauthorized: You do not have permission to delete variables.' }
    }

    const { error } = await supabase
        .from('secrets')
        .delete()
        .eq('id', id)
    // Remove .eq('user_id')

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/project/${projectId}`)
    return { success: true }
}

export interface BulkImportVariable {
    key: string
    value: string
    isSecret: boolean
}

export interface BulkImportResult {
    added: number
    updated: number
    skipped: number
    error?: string
}

export async function addVariablesBulk(projectId: string, variables: BulkImportVariable[]): Promise<BulkImportResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { added: 0, updated: 0, skipped: 0, error: 'Not authenticated' }
    }

    const { checkReauthRequired } = await import('@/lib/auth-check')
    if (await checkReauthRequired(supabase)) {
        return { added: 0, updated: 0, skipped: 0, error: 'REAUTH_REQUIRED' }
    }

    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, projectId, user.id)

    if (role !== 'owner' && role !== 'editor') {
        return { added: 0, updated: 0, skipped: 0, error: 'Unauthorized' }
    }

    // Import encryption utility
    const { encrypt } = await import('@/lib/encryption')

    // Fetch existing variables
    const { data: existingSecrets } = await supabase
        .from('secrets')
        .select('id, key')
        .eq('project_id', projectId)
    // Removed eq('user_id') to see ALL secrets in project

    const keyToIdMap = new Map(
        (existingSecrets || []).map(s => [s.key, s.id])
    )

    // const upsertPayload = []
    let added = 0
    let updated = 0
    const skipped = 0

    const processVariable = async (variable: BulkImportVariable) => {
        const encryptedValue = await encrypt(variable.value)
        const existingId = keyToIdMap.get(variable.key)

        if (existingId) updated++
        else added++

        // Extract key_id
        const keyId = encryptedValue.split(':')[1]

        return {
            ...(existingId ? { id: existingId } : {}),
            user_id: user.id, // Only matters on insert
            project_id: projectId,
            key: variable.key,
            value: encryptedValue,
            key_id: keyId,
            is_secret: variable.isSecret,
            last_updated_by: user.id,
            last_updated_at: new Date().toISOString()
        }
    }

    const payload = await Promise.all(variables.map(processVariable))

    if (payload.length > 0) {
        const { error } = await supabase
            .from('secrets')
            .upsert(payload)

        if (error) {
            console.error('Bulk upsert error:', error)
            return { added: 0, updated: 0, skipped: 0, error: error.message }
        }
    }

    revalidatePath(`/project/${projectId}`)
    return { added, updated, skipped }
}

