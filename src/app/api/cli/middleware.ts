import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function validateCliToken(request: Request): Promise<{ valid: boolean; userId?: string; error?: string }> {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7) // Remove 'Bearer '

    if (!token) {
        return { valid: false, error: 'No token provided' }
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const supabase = createAdminClient()

    // Query the token
    const { data: tokenData, error } = await supabase
        .from('personal_access_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .single()

    if (error || !tokenData) {
        return { valid: false, error: 'Invalid token' }
    }

    // Check if token has expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return { valid: false, error: 'token_expired' }
    }

    // Update last_used_at
    await supabase
        .from('personal_access_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)

    return { valid: true, userId: tokenData.user_id }
}

export function createUnauthorizedResponse(error: string) {
    return NextResponse.json({ error }, { status: 401 })
}
