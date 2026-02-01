
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
    try {
        const { device_code } = await request.json()

        if (!device_code) {
            return NextResponse.json({ error: 'device_code is required' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Check session status
        const { data: session, error } = await supabase
            .from('device_flow_sessions')
            .select('*')
            .eq('device_code', device_code)
            .single()

        if (error || !session) {
            return NextResponse.json({ error: 'Invalid device code' }, { status: 400 })
        }

        if (new Date(session.expires_at) < new Date()) {
            return NextResponse.json({ error: 'expired_token' }, { status: 400 })
        }

        if (session.status === 'pending') {
            return NextResponse.json({ error: 'authorization_pending' }, { status: 400 }) // Standard OAuth error for "keep waiting" is usually 400 with specific string or proper code
        }

        if (session.status === 'denied') {
            return NextResponse.json({ error: 'access_denied' }, { status: 403 })
        }

        if (session.status === 'approved' && session.user_id) {
            // Success! Generate a long-lived Access Token (PAT)

            // 1. Generate PAT
            const secretToken = crypto.randomUUID()
            const name = `CLI Device Token (${session.device_info?.hostname || 'Unknown'})` // More descriptive name? Or stick to static name + metadata.
            // Let's keep name static or unique? If static, it overwrites. A user might have multiple devices.
            // If we use "CLI Device Token", it overwrites the previous one!
            // WE MUST FIX THIS. Users wanted to see "devices". This implies multiple devices.
            // So we should name it differently or allow multiple tokens.

            // Current upsert logic: onConflict: 'user_id, name'.
            // So 'CLI Device Token' overwrites.

            // New Plan Logic: Use hostname in name OR allow multiple.
            // If I change name, I should check if it breaks anything.
            // "device_info" is user agent stuff.

            const deviceName = session.device_info?.hostname || 'Unknown Device';
            const tokenName = `CLI on ${deviceName}`;

            // Hash it for storage
            const tokenHash = crypto.createHash('sha256').update(secretToken).digest('hex')

            // Set token to expire in 3 days
            const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

            const { error: tokenError } = await supabase
                .from('personal_access_tokens')
                .upsert({
                    user_id: session.user_id,
                    name: tokenName,
                    token_hash: tokenHash,
                    last_used_at: new Date().toISOString(),
                    expires_at: expiresAt.toISOString(),
                    metadata: session.device_info || {}
                }, { onConflict: 'user_id, name' })
                .select()

            // Let's use Upsert but with dynamic name.
            /*
            .upsert({
                 ...
                 name: tokenName
            }, { onConflict: 'user_id, name' })
            */

            if (tokenError) {
                console.error('Error creating PAT:', tokenError)
                return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
            }

            // 1.5 Clean up legacy generic token (migration path)
            await supabase
                .from('personal_access_tokens')
                .delete()
                .eq('user_id', session.user_id)
                .eq('name', 'CLI Device Token')

            // 2. Cleanup session
            const { error: deleteError } = await supabase
                .from('device_flow_sessions')
                .delete()
                .eq('device_code', device_code)

            if (deleteError) {
                console.error("Failed to delete used session:", deleteError)
            }

            return NextResponse.json({
                access_token: secretToken,
                token_type: 'Bearer',
            })
        }

        return NextResponse.json({ error: 'unknown_error' }, { status: 500 })

    } catch (error) {
        console.error('Device poll error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
