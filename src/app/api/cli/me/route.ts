import { createAdminClient } from '@/lib/supabase/admin'
import { validateCliToken } from '@/lib/cli-auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const result = await validateCliToken(request)
    if ('status' in result) {
        return result
    }

    if (result.type === 'service') {
        return NextResponse.json({
            id: result.projectId,
            email: 'Service Token (CI)'
        })
    }

    const userId = result.userId

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
