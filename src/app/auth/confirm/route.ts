import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { origin } = new URL(request.url)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    const redirectBase = (appUrl && appUrl.replace(/\/+$/, "")) || origin

    // Create a Supabase client to handle the session
    const supabase = await createClient()

    // Sign out the user to force them to log in again
    await supabase.auth.signOut()

    // Redirect to the login page with a success parameter
    return NextResponse.redirect(`${redirectBase}/login?emailConfirmed=true`)
}
