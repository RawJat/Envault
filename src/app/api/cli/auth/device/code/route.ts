
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST() {
    try {
        const supabase = createAdminClient()

        // 1. Generate codes
        const deviceCode = crypto.randomUUID()
        // Generate 8-char alphanumeric code (A-Z, 0-9)
        // crypto.randomBytes(4).toString('hex') gives 8 chars but includes a-f.
        // We want uppercase and maybe less confusing look? 
        // Let's stick to simple hex uppercased for now, or 2 sets of 4 chars.
        // Example: ABCD-1234

        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed I, 1, O, 0 for clarity? Or just standard.
        // Let's use standard hex for simplicity first, or just random from set.
        const generateCode = (length: number) => {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const charactersLength = characters.length;
            for (var i = 0; i < length; i++) {
                // Secure random index
                const randomByte = crypto.randomBytes(1)[0]
                result += characters.charAt(randomByte % charactersLength);
            }
            return result;
        }

        const part1 = generateCode(4)
        const part2 = generateCode(4)
        const userCode = `${part1}-${part2}` // 8 chars + hyphen

        const expiresIn = 10 * 60 // 10 minutes (seconds)
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        // 2. Store in DB
        const { error } = await supabase
            .from('device_flow_sessions')
            .insert({
                device_code: deviceCode,
                user_code: userCode,
                status: 'pending',
                expires_at: expiresAt
            })

        if (error) {
            console.error('Error creating device session:', error)
            return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
        }

        // 3. Return to CLI
        // verification_uri should point to the page we will build
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const verificationUri = `${appUrl}/auth/device`

        return NextResponse.json({
            device_code: deviceCode,
            user_code: userCode,
            verification_uri: verificationUri,
            expires_in: expiresIn,
            interval: 2 // Polling interval in seconds
        })

    } catch (error) {
        console.error('Device flow init error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
