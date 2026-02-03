'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function createAccessRequest(token: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    // 1. Validate Invite Token (Using `project_invites` or simpler mechanism?)
    // Note: In refined plan, we discussed Invite Link -> Request.
    // If we use a simple "Token" that encodes ProjectID, we need to decode/verify it.
    // To be secure, we should have a `project_invites` table as planned initially?
    // Wait, the detailed plan mentioned `access_requests` but `project_invites` was also in Part 2A.
    // The simplified plan task checklist had `createRequest`.
    // Let's assume the token IS the `project_invites` token.

    // We didn't create `project_invites` in the migration file `sharing_feature.sql`?
    // Checking previous steps... 
    // Step 68 migration content: `project_members`, `secret_shares`, `access_requests`.
    // USE `access_requests` directly?
    // Ah, the user flow is: Owner shares link logic? 
    // If "Copy Link", usually the link contains projectId encrypted or signed.
    // Or we create a specific invite record per link generation?

    // Let's implement `createAccessRequest` assuming the `token` is actually just `projectId` 
    // (if public link) OR we implement `project_invites` if we missed it.

    // RE-READING MIGRATION in Step 68: NO `project_invites` table was created.
    // The plan said: "Invite Link -> Approval -> Access".
    // So the Link probably just points to `/join/[projectId]`? 
    // If so, `token` here is `projectId`.

    const projectId = token // Assuming simplified flow where link ID = Project ID for now to start.

    // Check if project exists
    const { data: project } = await supabase
        .from('projects')
        .select('id, user_id')
        .eq('id', projectId)
        .single()

    if (!project) {
        return { error: 'Project not found or invalid link.' }
    }

    if (project.user_id === user.id) {
        return { error: 'You are already the owner of this project.' }
    }

    // Check if already a member
    const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

    if (existingMember) {
        return { error: 'You are already a member of this project.' }
    }

    // Create Request
    const { error } = await supabase
        .from('access_requests')
        .insert({
            project_id: projectId,
            user_id: user.id,
            status: 'pending'
        })
    // If conflict (unique constraint), just return success (idempotent for user)

    if (error) {
        if (error.code === '23505') { // Unique violation
            return { success: true, message: 'Request already pending.' }
        }
        return { error: error.message }
    }

    // Notify Owner via email and in-app notification
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const adminSupabase = createAdminClient()

        // Get owner email
        const { data: owner } = await adminSupabase.auth.admin.getUserById(project.user_id)

        // Get requester email
        const { data: requester } = await adminSupabase.auth.admin.getUserById(user.id)

        // Get project name
        const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .single()

        if (owner?.user?.email && requester?.user?.email && projectData) {
            // Send email notification
            const { sendAccessRequestEmail } = await import('@/lib/email')
            await sendAccessRequestEmail(
                owner.user.email,
                requester.user.email,
                projectData.name
            )

            // Create in-app notification
            const { createAccessRequestNotification } = await import('@/lib/notifications')
            await createAccessRequestNotification(
                project.user_id,
                requester.user.email,
                projectData.name,
                projectId,
                user.id
            )
        }
    } catch (emailError) {
        // Don't fail the request if email/notification fails
        console.error('Failed to send access request notification:', emailError)
    }

    return { success: true }
}

export async function approveRequest(requestId: string, role: 'viewer' | 'editor', notifyUser: boolean = false) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Fetch request details
    const { data: request } = await supabase
        .from('access_requests')
        .select('*, projects!inner(user_id, name), auth_users:user_id(email)') // Fetch project owner & requester email
        .eq('id', requestId)
        .single()

    if (!request) return { error: 'Request not found.' }

    // Verify User is Owner of the Project
    // (projects.user_id check)
    // TypeScript might struggle with nested join typing, casting needed or check logic
    const projectOwner = (request.projects as any).user_id
    if (projectOwner !== user.id) {
        return { error: 'Unauthorized.' }
    }

    // 1. Add to Project Members
    const { error: memberError } = await supabase
        .from('project_members')
        .insert({
            project_id: request.project_id!,
            user_id: request.user_id,
            role: role,
            added_by: user.id
        })

    if (memberError) return { error: memberError.message }

    // 2. Delete Request (Data Hygiene)
    await supabase.from('access_requests').delete().eq('id', requestId)

    // 3. Notify User via email and in-app notification
    if (notifyUser) {
        const { sendAccessGrantedEmail } = await import('@/lib/email')
        // We need requester email. 
        // Supabase join `auth_users` might return it if we have access to auth schema (rarely enabled by default for users)
        // Usually we can't select from `auth.users` directly via client unless view exists.
        // We might need to use `supabaseAdmin` to fetch the email OR rely on the ID.

        // Use Admin client for email lookup
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const adminSupabase = createAdminClient()
        const { data: requester } = await adminSupabase.auth.admin.getUserById(request.user_id)

        if (requester && requester.user && requester.user.email) {
            const projectName = (request.projects as any).name

            // Send email
            await sendAccessGrantedEmail(requester.user.email, projectName)

            // Create in-app notification
            const { createAccessGrantedNotification } = await import('@/lib/notifications')
            await createAccessGrantedNotification(
                request.user_id,
                projectName,
                request.project_id!,
                role
            )
        }
    }

    revalidatePath('/dashboard') // Refresh owner dashboard
    return { success: true }
}

export async function rejectRequest(requestId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Fetch request to verify ownership
    const { data: request } = await supabase
        .from('access_requests')
        .select('projects!inner(user_id)')
        .eq('id', requestId)
        .single()

    if (!request) return { error: 'Request not found.' }

    const projectOwner = (request.projects as any).user_id
    if (projectOwner !== user.id) {
        return { error: 'Unauthorized.' }
    }

    // Get project details and requester info for notification
    const { data: fullRequest } = await supabase
        .from('access_requests')
        .select('user_id, project_id, projects(name)')
        .eq('id', requestId)
        .single()

    // Hard Delete
    await supabase.from('access_requests').delete().eq('id', requestId)

    // Notify requester that their request was denied
    if (fullRequest) {
        try {
            const { createAccessDeniedNotification } = await import('@/lib/notifications')
            const projectName = (fullRequest.projects as any)?.name || 'Unknown Project'
            await createAccessDeniedNotification(
                fullRequest.user_id,
                projectName,
                fullRequest.project_id
            )
        } catch (error) {
            console.error('Failed to send access denied notification:', error)
        }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function removeMember(projectId: string, memberUserId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Verify Owner
    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, projectId, user.id)

    if (role !== 'owner') return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', memberUserId)

    if (error) return { error: error.message }

    revalidatePath(`/project/${projectId}`)
    return { success: true }
}

export async function updateMemberRole(projectId: string, memberUserId: string, newRole: 'viewer' | 'editor') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Verify Owner
    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, projectId, user.id)

    if (role !== 'owner') return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('project_id', projectId)
        .eq('user_id', memberUserId)

    if (error) return { error: error.message }

    revalidatePath(`/project/${projectId}`)
    return { success: true }
}

export async function inviteUser(projectId: string, email: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Verify Owner or Editor
    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, projectId, user.id)

    if (role !== 'owner' && role !== 'editor') return { error: 'Unauthorized' }

    // Check project name for email
    const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

    if (!project) return { error: 'Project not found' }

    // Send Email
    const { sendInviteEmail } = await import('@/lib/email')
    await sendInviteEmail(email, project.name, projectId)

    return { success: true }
}
