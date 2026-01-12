import { SupabaseClient } from '@supabase/supabase-js'

export const REAUTH_THRESHOLD_SECONDS = 15 * 60 // 15 minutes

export async function checkReauthRequired(supabase: SupabaseClient) {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return true // No session implies re-auth needed (or login)

    const lastSignIn = new Date(session.user.last_sign_in_at || 0).getTime()
    const now = new Date().getTime()
    const diffSeconds = (now - lastSignIn) / 1000

    return diffSeconds > REAUTH_THRESHOLD_SECONDS
}
