'use client'

import { useEffect, useCallback } from 'react'
import { useReauthStore } from '@/lib/reauth-store'

// 15 minutes in milliseconds
const INACTIVITY_TIMEOUT = 15 * 60 * 1000

export function SessionMonitor() {
    const setLocked = useReauthStore((state) => state.setLocked)

    const handleActivity = useCallback(() => {
        // Debounce logic could be added here if performance is an issue, 
        // but for simple resetting a timestamp it's usually fine.
        sessionStorage.setItem('lastActivity', Date.now().toString())
    }, [])

    useEffect(() => {
        // Initialize activity timestamp
        handleActivity()

        const checkInactivity = () => {
            const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || '0', 10)
            const now = Date.now()

            if (now - lastActivity > INACTIVITY_TIMEOUT) {
                // Trigger lock
                setLocked(true)
            }
        }

        // Check every minute
        const intervalId = setInterval(checkInactivity, 60 * 1000)

        // Listen for user activity
        window.addEventListener('mousemove', handleActivity)
        window.addEventListener('keydown', handleActivity)
        window.addEventListener('click', handleActivity)
        window.addEventListener('scroll', handleActivity)

        return () => {
            clearInterval(intervalId)
            window.removeEventListener('mousemove', handleActivity)
            window.removeEventListener('keydown', handleActivity)
            window.removeEventListener('click', handleActivity)
            window.removeEventListener('scroll', handleActivity)
        }
    }, [handleActivity, setLocked])

    return null
}
