import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
    try {
        const { refresh_token, device_info } = await request.json()

        if (!refresh_token || typeof refresh_token !== 'string') {
            return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 })
        }

        if (!refresh_token.startsWith('envault_rt_')) {
            return NextResponse.json({ error: 'Invalid refresh token format' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex')

        // 1. Validate the refresh token
        const { data: tokenData, error: tokenError } = await supabase
            .from('personal_access_tokens')
            .select('user_id, expires_at, metadata')
            .eq('token_hash', tokenHash)
            .single()

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'Invalid or revoked refresh token' }, { status: 401 })
        }

        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
            return NextResponse.json({ error: 'refresh_token_expired' }, { status: 401 })
        }

        // Update last_used_at for refresh token
        supabase
            .from('personal_access_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('token_hash', tokenHash)
            .then()

        // 2. Issue a new Access Token
        const secretAccessToken = 'envault_at_' + crypto.randomUUID()
        const deviceName = device_info?.hostname || tokenData.metadata?.hostname || 'Unknown Device'
        const accessTokenName = `CLI Access Token on ${deviceName}`
        const atHash = crypto.createHash('sha256').update(secretAccessToken).digest('hex')
        const atExpiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        const { error: atError } = await supabase
            .from('personal_access_tokens')
            .upsert({
                user_id: tokenData.user_id,
                name: accessTokenName,
                token_hash: atHash,
                last_used_at: new Date().toISOString(),
                expires_at: atExpiresAt.toISOString(),
                metadata: device_info || tokenData.metadata || {}
            }, { onConflict: 'user_id, name' })

        if (atError) {
            console.error('Error creating access token during refresh:', atError)
            return NextResponse.json({ error: 'Failed to generate new access token' }, { status: 500 })
        }

        return NextResponse.json({
            access_token: secretAccessToken,
            expires_in: 3600,
            token_type: 'Bearer'
        })

    } catch (error) {
        console.error('Refresh token error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
