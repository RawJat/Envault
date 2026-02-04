'use server'

import { createClient } from '@/lib/supabase/server'
import { checkReauthRequired } from '@/lib/auth-check'

export async function sendReauthCode(email: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: false,
        }
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function verifyReauthCode(email: string, token: string) {
    const supabase = await createClient()

    // Verify OTP
    const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
    })

    if (error) {
        return { error: error.message }
    }

    // Explicitly update the user session in the cookie store? 
    // verifyOtp usually handles this, but let's confirm we refresh the session.
    // The createClient uses cookie-based storage so the response cookies from verifyOtp 
    // should automatically be handled by the middleware/nextjs handler if using the right setup.
    // However, verifyOtp behaves like signIn.

    return { success: true }
}

// New action for client-side checks
export async function checkReauthRequiredAction() {
    const supabase = await createClient()
    return await checkReauthRequired(supabase)
}
