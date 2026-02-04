'use client'

import { useEffect } from 'react'
import { useEnvaultStore } from '@/lib/store'
import { getProjects } from '@/app/project-actions'

export function ProjectsSync() {
    const setProjects = useEnvaultStore((state) => state.setProjects)
    const setLoading = useEnvaultStore((state) => state.setLoading)

    useEffect(() => {
        async function loadProjects() {
            setLoading(true)
            const result = await getProjects()
            if (result.data) {
                // Transform Supabase data to match local store format
                // Define internal type for Supabase response
                type ProjectRow = {
                    id: string
                    name: string
                    created_at: string
                    secrets: { count: number }[]
                }

                const projects = (result.data as unknown as ProjectRow[]).map((project) => ({
                    id: project.id,
                    name: project.name,
                    createdAt: project.created_at,
                    variables: [], // Optimized: Empty array for dashboard list
                    secretCount: project.secrets?.[0]?.count || 0,
                }))
                setProjects(projects)
            } else {
                setLoading(false)
            }
        }
        loadProjects()
    }, [setProjects, setLoading])

    return null
}
