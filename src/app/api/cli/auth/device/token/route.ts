
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
            const secretToken = crypto.randomUUID() // The actual secret the CLI keeps
            const name = 'CLI Device Token' // Fixed name to ensure update instead of new create

            // Hash it for storage
            const tokenHash = crypto.createHash('sha256').update(secretToken).digest('hex')

            const { error: tokenError } = await supabase
                .from('personal_access_tokens')
                .upsert({
                    user_id: session.user_id,
                    name,
                    token_hash: tokenHash,
                    last_used_at: new Date().toISOString() // Update usage time
                }, {
                    onConflict: 'user_id, name'
                })

            if (tokenError) {
                console.error('Error creating PAT:', tokenError)
                return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
            }

            // 2. Cleanup session (optional, or mark as completed to prevent reuse)
            await supabase.from('device_flow_sessions').delete().eq('device_code', device_code)

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
