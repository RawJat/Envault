
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function validateCliToken(request: Request) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }

    const token = authHeader.split(' ')[1]
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('personal_access_tokens')
        .select('user_id, last_used_at')
        .eq('token_hash', tokenHash)
        .single()

    if (error || !data) {
        return null
    }

    // Update last_used_at (async, fire and forget)
    supabase
        .from('personal_access_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
        .then()

    return data.user_id
}
