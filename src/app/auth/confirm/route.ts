import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { origin } = new URL(request.url)

    // Create a Supabase client to handle the session
    const supabase = await createClient()

    // Sign out the user to force them to log in again
    await supabase.auth.signOut()

    // Redirect to the login page with a success parameter
    return NextResponse.redirect(`${origin}/?emailConfirmed=true`)
}
