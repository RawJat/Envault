
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
            // Success! Generate a long-lived Refresh Token and short-lived Access Token

            // 1. Generate Refresh Token (1 month)
            const secretRefreshToken = 'envault_rt_' + crypto.randomUUID()
            const deviceName = session.device_info?.hostname || 'Unknown Device'
            const refreshTokenName = `CLI Refresh Token on ${deviceName}`
            const rtHash = crypto.createHash('sha256').update(secretRefreshToken).digest('hex')
            const rtExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

            const { error: rtError } = await supabase
                .from('personal_access_tokens')
                .upsert({
                    user_id: session.user_id,
                    name: refreshTokenName,
                    token_hash: rtHash,
                    last_used_at: new Date().toISOString(),
                    expires_at: rtExpiresAt.toISOString(),
                    metadata: session.device_info || {}
                }, { onConflict: 'user_id, name' })

            if (rtError) {
                console.error('Error creating Refresh Token:', rtError)
                return NextResponse.json({ error: 'Failed to generate refresh token' }, { status: 500 })
            }

            // 2. Generate Access Token (1 hour)
            const secretAccessToken = 'envault_at_' + crypto.randomUUID()
            const accessTokenName = `CLI Access Token on ${deviceName}`
            const atHash = crypto.createHash('sha256').update(secretAccessToken).digest('hex')
            const atExpiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

            const { error: atError } = await supabase
                .from('personal_access_tokens')
                .upsert({
                    user_id: session.user_id,
                    name: accessTokenName,
                    token_hash: atHash,
                    last_used_at: new Date().toISOString(),
                    expires_at: atExpiresAt.toISOString(),
                    metadata: session.device_info || {}
                }, { onConflict: 'user_id, name' })

            if (atError) {
                console.error('Error creating Access Token:', atError)
                return NextResponse.json({ error: 'Failed to generate access token' }, { status: 500 })
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
                access_token: secretAccessToken,
                refresh_token: secretRefreshToken,
                expires_in: 3600, // 1 hour in seconds
                token_type: 'Bearer',
            })
        }

        return NextResponse.json({ error: 'unknown_error' }, { status: 500 })

    } catch (error) {
        console.error('Device poll error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
