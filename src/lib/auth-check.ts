import { SupabaseClient } from '@supabase/supabase-js'

export const REAUTH_THRESHOLD_SECONDS = 15 * 60 // 15 minutes

export async function getReauthStatus(supabase: SupabaseClient) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { required: true }

    const lastSignIn = new Date(user.last_sign_in_at || 0).getTime()
    const now = new Date().getTime()
    const diffSeconds = (now - lastSignIn) / 1000

    // Calculate when re-auth will be required
    // lastSignIn + threshold = expiration time
    const expiresAt = lastSignIn + (REAUTH_THRESHOLD_SECONDS * 1000)

    return {
        required: diffSeconds > REAUTH_THRESHOLD_SECONDS,
        expiresAt
    }
}

export async function checkReauthRequired(supabase: SupabaseClient) {
    const status = await getReauthStatus(supabase)
    return status.required
}
