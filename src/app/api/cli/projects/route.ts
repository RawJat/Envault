
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

    // Query both owned and shared projects
    // We rely on RLS logic ideally, but admin client bypasses RLS.
    // So we need explicit query: 
    // Projects where (user_id = me) OR (id IN (select project_id from project_members where user_id = me))

    // Supabase JS "or" syntax with foreign table filters is tricky.
    // Easiest is to fetch both and combine, or usage "or" filter string.

    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, user_id, project_members!inner(user_id)')
        .eq('project_members.user_id', userId)
        .order('name')

    // Wait, the above only fetches SHARED projects where I am a member.
    // I also need my OWN projects. 
    // Composing a single query for "Owned OR Member" without RLS (since we use Admin for CLI usually to bypass some auth defaults or using a service role) 
    // actually, `validateCliToken` validates the user but doesn't set `auth.uid()` for RLS context unless we use `supabase.auth.setSession` or standard client with token.
    // The current CLI implementation uses `createAdminClient()` which is SERVICE ROLE. 
    // Service Role BYPASSES RLS. So we MUST write the filter manually.

    const { data: allProjects, error: fetchError } = await supabase
        .from('projects')
        .select('id, name, user_id, project_members(user_id, role)')

    // Filtering in memory might be easiest if project count is small, but bad for scaling.
    // Better: `or(user_id.eq.${userId},project_members.user_id.eq.${userId})`? 
    // Using Supabase `or` filter:

    const { data, error: qError } = await supabase
        .from('projects')
        .select('id, name, user_id, project_members(user_id)')
        .or(`user_id.eq.${userId},project_members.user_id.eq.${userId}`)
    // Note: filtering on joined table with OR at top level is not standard in Postgrest without flattening.
    // It's safer to make 2 queries and merge or use a View/RPC.
    // For now, let's fetch Owned and Member-based separately and merge. It's safer and clearer.

    if (qError) return NextResponse.json({ error: qError.message }, { status: 500 })

    // 1. Owned
    const { data: owned } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', userId)

    // 2. Member
    const { data: shared } = await supabase
        .from('project_members')
        .select('projects(id, name)')
        .eq('user_id', userId)

    const sharedProjects = shared?.map((m: any) => m.projects) || []

    // Combine and dedupe
    const combined = [...(owned || []), ...sharedProjects]
    // Dedupe just in case (shouldn't happen if logic is correct: owner can't be member)
    const uniqueMap = new Map()
    combined.forEach(p => uniqueMap.set(p.id, p))
    const finalProjects = Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ projects: finalProjects })
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
