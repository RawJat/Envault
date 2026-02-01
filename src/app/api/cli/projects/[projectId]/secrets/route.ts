
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
    { params }: { params: Promise<{ projectId: string }> } // In Next 15, params is a Promise
) {
    const result = await validateCliToken(request)
    if (typeof result !== 'string') {
        return result // Return the error response
    }
    const userId = result

    const { projectId } = await params

    const supabase = createAdminClient()

    // Verify project ownership
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()

    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch secrets
    const { data: secrets } = await supabase
        .from('secrets')
        .select('key, value')
        .eq('project_id', projectId)

    if (!secrets) {
        return NextResponse.json({ secrets: [] })
    }

    // Decrypt secrets
    // Note: This is heavy if many secrets.
    const decryptedSecrets = await Promise.all(secrets.map(async (s) => {
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

    // Verify project
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()

    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Process Upsert
    // We need to fetch existing secrets to reuse IDs or KeyIDs if existing
    // Or simpler: We use `encrypt` which handles KeyID internally (fetches active key).

    // We also need to map Keys to existing IDs if we want to update vs insert?
    // Supabase upsert on (project_id, user_id, key) if unique constraint exists.
    // Let's check schema... likely `unique(user_id, project_id, key)` or similar.
    // Assuming upsert works by key for the project.

    // BUT `secrets` table has `id`. We need to fetch existing IDs for these keys to properly upsert without duplicates if constraint is just ID?
    // Usually unique constraint is (project_id, key, user_id).

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
            user_id: userId,
            project_id: projectId,
            key: s.key,
            value: encryptedValue,
            key_id: keyId,
            is_secret: true // Default to secret for CLI pushes
        }
    }))

    if (upsertData.length > 0) {
        const { error } = await supabase
            .from('secrets')
            .upsert(upsertData) // Upsert relies on ID being present for updates, or unique constraint.
        // If we provided ID, it updates. If no ID, it inserts.

        if (error) {
            console.error('Deploy error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
    }

    return NextResponse.json({ success: true, count: upsertData.length })
}
