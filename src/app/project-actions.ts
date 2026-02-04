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

export async function getProjects() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Check cache first
    const { cacheGet, cacheSet, CacheKeys, CACHE_TTL } = await import('@/lib/cache')
    const cacheKey = CacheKeys.userProjects(user.id)
    interface ProjectWithRole {
        id: string
        user_id: string
        name: string
        role?: string
        secrets: { count: number }[]
    }
    const cachedProjects = await cacheGet<ProjectWithRole[]>(cacheKey)

    if (cachedProjects !== null) {
        return { data: cachedProjects }
    }

    // Step 1: Fetch projects only (no joins to avoid RLS recursion)
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects:', error)
        return { error: error.message }
    }

    if (!projects || projects.length === 0) {
        // Cache empty result to avoid repeated queries
        await cacheSet(cacheKey, [], CACHE_TTL.PROJECT_LIST)
        return { data: [] }
    }

    // Step 2: Fetch secrets count for each project
    const projectIds = projects.map(p => p.id)
    const { data: secretCounts } = await supabase
        .from('secrets')
        .select('id, project_id')
        .in('project_id', projectIds)

    // Create a count map
    const secretCountMap = new Map<string, number>()
    secretCounts?.forEach(s => {
        secretCountMap.set(s.project_id, (secretCountMap.get(s.project_id) || 0) + 1)
    })

    // Step 3: Fetch project members for current user
    const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id, role')
        .in('project_id', projectIds)
        .eq('user_id', user.id)

    // Create membership map
    const membershipMap = new Map(memberships?.map(m => [m.project_id, m.role]) || [])

    // Step 4: Enrich projects with the data
    const enrichedProjects = projects.map((p) => {
        let role = 'viewer' // Safe default
        if (p.user_id === user.id) {
            role = 'owner'
        } else if (membershipMap.has(p.id)) {
            role = membershipMap.get(p.id)
        }

        return {
            ...p,
            secrets: [{ count: secretCountMap.get(p.id) || 0 }],
            role,
            isStart: false // UI Helper
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

