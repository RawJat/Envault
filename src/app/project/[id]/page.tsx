import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ProjectDetailView from '@/components/editor/project-detail-view'
import * as fs from 'fs'
import * as path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    const timestamp = new Date().toISOString()
    const LOG_FILE = path.join(process.cwd(), 'envault_debug.log')
    const logToFile = (msg: string) => {
        fs.appendFileSync(LOG_FILE, `[${timestamp}] [ProjectPage] ${msg}\n`)
    }

    // Fetch the project first (no joins to avoid RLS recursion)
    const { data: project, error: _projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (_projectError || !project) {
        logToFile(`Project fetch failed for ID: ${id}. Error: ${JSON.stringify(_projectError)}`)
        redirect('/dashboard')
    }

    // Verify user has access to this project
    const { getProjectRole } = await import('@/lib/permissions')
    const role = await getProjectRole(supabase, id, user.id)

    if (!role) {
        // User has no access to this project
        logToFile(`Access denied for user ${user.id} to project ${id}`)
        redirect('/dashboard')
    }

    // Fetch secrets separately
    const { data: secrets, error: secretsError } = await supabase
        .from('secrets')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: true })

    console.log(`[ProjectPage] Fetching secrets for project: ${id}`)
    if (secretsError) {
        console.error(`[ProjectPage] Error fetching secrets:`, secretsError)
    } else {
        console.log(`[ProjectPage] Fetched ${secrets?.length || 0} secrets`)
    }

    // Transform to match local store format and decrypt values
    const { decrypt } = await import('@/lib/encryption')

    // Helper function to check if a value looks like encrypted data (base64)
    const isEncrypted = (value: string): boolean => {
        // Encrypted values are base64 strings with a minimum length
        // Base64 pattern: only contains A-Z, a-z, 0-9, +, /, and = for padding
        if (value.startsWith('v1:')) return true
        const base64Pattern = /^[A-Za-z0-9+/]+=*$/
        return value.length > 40 && base64Pattern.test(value)
    }

    // Fetch user details for creators and updaters
    const userIds = new Set<string>()
    secrets?.forEach((s) => {
        if (s.user_id) userIds.add(s.user_id)
        if (s.last_updated_by) userIds.add(s.last_updated_by)
    })

    const userMap = new Map<string, { email: string; id: string; avatar?: string }>()
    if (userIds.size > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminSupabase = createAdminClient()
        await Promise.all(Array.from(userIds).map(async (uid) => {
            const { data } = await adminSupabase.auth.admin.getUserById(uid)
            if (data?.user) {
                userMap.set(uid, {
                    id: uid,
                    email: data.user.email || '',
                    avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || undefined
                })
            }
        }))
    }

    const transformedProject = {
        id: project.id,
        name: project.name,
        user_id: project.user_id,
        createdAt: project.created_at,
        variables: await Promise.all((secrets || []).map(async (secret) => {
            let decryptedValue = secret.value

            // Only try to decrypt if it looks like encrypted data
            if (isEncrypted(secret.value)) {
                try {
                    decryptedValue = await decrypt(secret.value)
                } catch (error) {
                    // If decryption fails, log error and keep original value
                    console.error(`Failed to decrypt value for key: ${secret.key}`, error)
                }
            }

            const creator = secret.user_id ? userMap.get(secret.user_id) : undefined
            const updater = secret.last_updated_by ? userMap.get(secret.last_updated_by) : undefined

            return {
                id: secret.id,
                key: secret.key,
                value: decryptedValue,
                isSecret: secret.is_secret,
                lastUpdatedBy: secret.last_updated_by,
                lastUpdatedAt: secret.last_updated_at,
                userInfo: {
                    creator,
                    updater
                }
            }
        })),
        secretCount: secrets?.length || 0,
    }

    // Diagnostics: log to the same file we can see
    logToFile(`Project: ${project.name} (${id}) - Fetched ${secrets?.length || 0} secrets`)

    return <ProjectDetailView project={transformedProject} />
}
