
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCliToken } from '@/lib/cli-auth'
import { revalidatePath } from 'next/cache'
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



    // Wait, the above only fetches SHARED projects where I am a member.
    // I also need my OWN projects. 
    // Composing a single query for "Owned OR Member" without RLS (since we use Admin for CLI usually to bypass some auth defaults or using a service role) 
    // actually, `validateCliToken` validates the user but doesn't set `auth.uid()` for RLS context unless we use `supabase.auth.setSession` or standard client with token.
    // The current CLI implementation uses `createAdminClient()` which is SERVICE ROLE. 
    // Service Role BYPASSES RLS. So we MUST write the filter manually.

    // Fetch owned and shared projects separately, then merge
    // This is safer than using .or() with joined tables which doesn't work in PostgREST

    // 1. Owned projects
    const { data: owned } = await supabase
        .from('projects')
        .select('id, name, user_id')
        .eq('user_id', userId)

    // 2. Shared projects (where user is a member)
    const { data: shared } = await supabase
        .from('project_members')
        .select('projects(id, name, user_id), role')
        .eq('user_id', userId)

    // Map owned projects with isOwner flag
    const ownedProjects = (owned || []).map(p => ({
        id: p.id,
        name: p.name,
        isOwner: true,
        role: 'owner' as const
    }))

    // Map shared projects with isOwner flag and role
    interface SharedProjectMember {
        projects: { id: string; name: string; user_id: string } | { id: string; name: string; user_id: string }[] | null
        role: "viewer" | "editor" | "owner"
    }

    const sharedProjects = (shared || []).map((m) => {
        const member = m as unknown as SharedProjectMember
        // Handle potential array or object from join
        const project = Array.isArray(member.projects) ? member.projects[0] : member.projects
        return {
            id: project?.id,
            name: project?.name,
            isOwner: false,
            role: member.role
        }
    })

    // Combine and dedupe
    const combined = [...ownedProjects, ...sharedProjects]

    // Dedupe just in case (shouldn't happen if logic is correct: owner can't be member)
    const uniqueMap = new Map()
    combined.forEach(p => {
        if (!uniqueMap.has(p.id)) {
            uniqueMap.set(p.id, p)
        }
    })

    const finalProjects = Array.from(uniqueMap.values()).filter(p => p.name).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    return NextResponse.json({
        projects: finalProjects,
        owned: ownedProjects.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        shared: sharedProjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    })
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

    // Create notification for project creation
    await supabase.from('notifications').insert({
        user_id: userId,
        type: 'project_created',
        title: 'Project Created via CLI',
        message: `You created project "${name.trim()}"`,
        icon: 'FolderPlus',
        variant: 'success',
        metadata: {
            projectId: data.id,
            projectName: name.trim(),
            source: 'cli'
        },
        action_url: `/project/${data.id}`,
        action_type: 'view_project'
    })

    // Invalidate user's project list cache
    const { cacheDel, CacheKeys } = await import('@/lib/cache')
    await cacheDel(CacheKeys.userProjects(userId))
    revalidatePath('/dashboard')

    return NextResponse.json({ project: data })
}
