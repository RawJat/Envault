'use client'

import { useEffect } from 'react'
import { useEnvaultStore } from '@/lib/store'
import { getProjects } from '@/app/project-actions'

export function ProjectsSync() {
    const setProjects = useEnvaultStore((state) => state.setProjects)
    const setLoading = useEnvaultStore((state) => state.setLoading)
    const login = useEnvaultStore((state) => state.login)

    useEffect(() => {
        async function loadData() {
            setLoading(true)

            // value: [UserResponse, ProjectResponse]
            const [userResult, projectResult] = await Promise.all([
                import('@/lib/supabase/client').then(m => m.createClient().auth.getUser()),
                getProjects()
            ])

            if (userResult.data.user) {
                const u = userResult.data.user
                login({
                    id: u.id,
                    email: u.email!,
                    firstName: u.user_metadata.full_name?.split(' ')[0] || 'User',
                    lastName: u.user_metadata.full_name?.split(' ')[1] || '',
                    username: u.user_metadata.user_name || '',
                    avatar: u.user_metadata.avatar_url,
                    authProviders: u.app_metadata.providers || [],
                    app_metadata: u.app_metadata,
                    user_metadata: u.user_metadata
                })
            }

            if (projectResult.data) {
                setProjects(projectResult.data as any)
            }

            setLoading(false)
        }
        loadData()
    }, [setProjects, setLoading, login])

    return null
}
