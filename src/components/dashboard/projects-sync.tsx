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
                // The server action getProjects() already returns enriched Project[] objects
                setProjects(result.data as any)
            } else {
                setLoading(false)
            }
        }
        loadProjects()
    }, [setProjects, setLoading])

    return null
}
