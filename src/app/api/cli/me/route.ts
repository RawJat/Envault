import { createAdminClient } from '@/lib/supabase/admin'
import { validateCliToken } from '@/lib/cli-auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const result = await validateCliToken(request)
    if (typeof result !== 'string') {
        return result
    }
    const userId = result

    const supabase = createAdminClient()

    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
        id: user.id,
        email: user.email
    })
}
