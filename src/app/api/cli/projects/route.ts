
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

    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', userId)
        .order('name')

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ projects })
}

export async function POST(request: Request) {
    const result = await validateCliToken(request)
    if (typeof result !== 'string') {
        return result
    }
    const userId = result

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
        .from('projects')
        .insert({
            name: name.trim(),
            user_id: userId
        })
        .select('id, name')
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ project: data })
}
