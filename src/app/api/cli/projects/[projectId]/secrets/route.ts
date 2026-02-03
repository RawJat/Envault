
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCliToken } from '@/lib/cli-auth'
import { decrypt, encrypt } from '@/lib/encryption'
import { NextResponse } from 'next/server'

interface SecretPayload {
    key: string
    value: string
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const result = await validateCliToken(request)
    if (typeof result !== 'string') {
        return result // Return the error response
    }
    const userId = result

    const { projectId } = await params

    const supabase = createAdminClient()

    // 1. Determine Access Level
    // We can't use `getProjectRole` from `@/lib/permissions` easily if it relies on RLS-enforced client 
    // BUT `createAdminClient` bypasses RLS, so manual checks are needed, which `getProjectRole` does 
    // (it checks DB records manually). So we CAN use it.

    // However, importing from `@/lib/permissions` in API route is fine.
    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, projectId, userId)

    let targetSecrets = []

    if (role) {
        // Has Project-Level Access (Owner/Editor/Viewer)
        // Fetch ALL secrets for project
        const { data: secrets, error } = await supabase
            .from('secrets')
            .select('key, value')
            .eq('project_id', projectId)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        targetSecrets = secrets || []

    } else {
        // Check for Granular Secret Shares
        // Fetch secrets where id IN (select secret_id from secret_shares where user_id = me)
        const { data: shares, error } = await supabase
            .from('secret_shares')
            .select('secret_id, secrets(key, value, project_id)')
            .eq('user_id', userId)
            // We need to filter by project_id in the joined table, but Supabase filtering on joined table 
            // is `secrets.project_id`.eq.`${projectId}` which is tricky in JS syntax without flatten.

            // Allow fetching all shares, then filter by project in memory? 
            // Or better: filter `secrets` where `project_id` = projectId.
            // .eq('secrets.project_id', projectId) should work if inner valid.

            // Let's try:
            // But `secret_shares` -> `secrets`.
            .eq('secrets.project_id', projectId) // This acts as Inner Join filter often
        // If it fails to filter, we do in memory.

        // Actually, with `!inner` on join it works as filter.
        // .select('..., secrets!inner(...)')

        const { data: sharesFiltered } = await supabase
            .from('secret_shares')
            .select('secret_id, secrets!inner(key, value, project_id)')
            .eq('user_id', userId)
            .eq('secrets.project_id', projectId)

        if (sharesFiltered && sharesFiltered.length > 0) {
            targetSecrets = sharesFiltered.map((s: any) => ({
                key: s.secrets.key,
                value: s.secrets.value
            }))
        } else {
            // No access
            return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
        }
    }

    // Decrypt secrets
    const decryptedSecrets = await Promise.all(targetSecrets.map(async (s) => {
        try {
            const cleanValue = await decrypt(s.value)
            return { key: s.key, value: cleanValue }
        } catch (e) {
            console.error(`Failed to decrypt secret ${s.key}`, e)
            return { key: s.key, value: '<<DECRYPTION_FAILED>>' }
        }
    }))

    return NextResponse.json({ secrets: decryptedSecrets })
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const result = await validateCliToken(request)
    if (typeof result !== 'string') {
        return result // Return the error response
    }
    const userId = result

    const { projectId } = await params
    const body = await request.json()
    const { secrets } = body as { secrets: SecretPayload[] }

    if (!Array.isArray(secrets)) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify Access: Owner OR Editor
    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, projectId, userId)

    if (role !== 'owner' && role !== 'editor') {
        return NextResponse.json({ error: 'Unauthorized: Read-only access' }, { status: 403 })
    }

    // Process Upsert
    // Fetch existing keys for IDs
    const { data: existingSecrets } = await supabase
        .from('secrets')
        .select('id, key')
        .eq('project_id', projectId)

    const keyMap = new Map((existingSecrets || []).map(s => [s.key, s.id]))

    const upsertData = await Promise.all(secrets.map(async (s) => {
        const encryptedValue = await encrypt(s.value)
        const keyId = encryptedValue.split(':')[1]

        return {
            ...(keyMap.has(s.key) ? { id: keyMap.get(s.key) } : {}),
            user_id: userId, // Current user is modifying it (or new owner if inserting, but user_id usually creator)
            // If updating, strictly `upsert` might require us to NOT change `user_id` if we want to preserve original creator?
            // But `user_id` in secrets is just for record. 
            // Let's set it to current user for new, but for update `upsert` handles it?
            // If ID present, `upsert` updates provided fields.
            // If we provide `user_id`, access control policies usually ignore it for updates? 
            // But we are ADMIN client here.
            // Let's keep `user_id` as the person who LAST "Created/Pushed" this version?
            // Or better, respect `last_updated_by`.

            // We should use `last_updated_by` for audit.
            // `user_id` is NOT NULL usually.

            project_id: projectId,
            key: s.key,
            value: encryptedValue,
            key_id: keyId,
            is_secret: true,
            last_updated_by: userId,
            last_updated_at: new Date().toISOString()
        }
    }))

    if (upsertData.length > 0) {
        const { error } = await supabase
            .from('secrets')
            .upsert(upsertData)

        if (error) {
            console.error('Deploy error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
    }

    return NextResponse.json({ success: true, count: upsertData.length })
}
