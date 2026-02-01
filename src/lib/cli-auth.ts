import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function validateCliToken(request: Request): Promise<string | NextResponse> {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('personal_access_tokens')
        .select('user_id, last_used_at, expires_at')
        .eq('token_hash', tokenHash)
        .single()

    if (error || !data) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if token has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }

    // Update last_used_at (async, fire and forget)
    supabase
        .from('personal_access_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
        .then()

    return data.user_id
}
