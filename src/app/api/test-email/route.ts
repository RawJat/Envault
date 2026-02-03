import { sendTestEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const result = await sendTestEmail(email)

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Test email sent successfully!',
                data: result.data
            })
        } else {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 })
        }
    } catch (error) {
        console.error('Test email error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to send test email'
        }, { status: 500 })
    }
}
