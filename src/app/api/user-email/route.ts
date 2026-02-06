import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        // Verify user is authenticated
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }

        // Use admin client to fetch user email
        const adminSupabase = createAdminClient()
        const { data: userData, error } = await adminSupabase.auth.admin.getUserById(userId)

        if (error || !userData.user) {
            return NextResponse.json({ email: null, username: null })
        }

        const email = userData.user.email
        const username = userData.user.user_metadata?.username || userData.user.user_metadata?.name

        return NextResponse.json({ email, username })
    } catch (error) {
        console.error('Error fetching user email:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
