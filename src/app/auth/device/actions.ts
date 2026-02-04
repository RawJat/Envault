
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

    // Create notification for device login
    const deviceName = session.device_info?.hostname || 'Unknown Device'
    const { error: notifError } = await admin
        .from('notifications')
        .insert({
            user_id: user.id,
            type: 'new_device_access',
            title: 'New Device Authenticated',
            message: `CLI access granted to ${deviceName}`,
            icon: 'Terminal', // Icon for CLI access
            variant: 'info',
            metadata: {
                device_info: session.device_info,
                device_code: session.device_code
            }
        })

    if (notifError) {
        console.error('Failed to create device login notification:', notifError)
        // Don't fail the request if notification fails
    } else {
        console.log('✅ Device login notification created successfully')
    }

    return { success: true }
}
