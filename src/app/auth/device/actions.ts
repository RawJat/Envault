
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function verifyDeviceCode(userCode: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'You must be logged in to approve this device.' }
    }

    if (!userCode || userCode.length !== 9) { // 4+1+4
        return { error: 'Invalid code format. Expected format: XXXX-XXXX' }
    }

    const admin = createAdminClient()

    // Find the session
    const { data: session, error } = await admin
        .from('device_flow_sessions')
        .select('*')
        .eq('user_code', userCode)
        .eq('status', 'pending')
        .single()

    if (error || !session) {
        return { error: 'Invalid or expired code. Please try again.' }
    }

    if (new Date(session.expires_at) < new Date()) {
        return { error: 'Code has expired. Please run "envault login" again.' }
    }

    // Approve it
    const { error: updateError } = await admin
        .from('device_flow_sessions')
        .update({
            status: 'approved',
            user_id: user.id
        })
        .eq('device_code', session.device_code)

    if (updateError) {
        return { error: 'Failed to approve device. Please try again.' }
    }

    return { success: true }
}
