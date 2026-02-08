"use client"

import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useHotkeys } from "@/hooks/use-hotkeys"
import { ShortcutHelpModal } from "@/components/modals/shortcut-help-modal"
import { SearchDialog } from "@/components/modals/search-dialog"
import { useEnvaultStore } from "@/lib/store"
import { signOut } from "@/app/actions"

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const [showHelp, setShowHelp] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const logout = useEnvaultStore((state) => state.logout)

    // Listen for custom open events
    useEffect(() => {
        const handleOpenSearch = () => setShowSearch(true)
        const handleOpenHelp = () => setShowHelp(true)
        const handleUniversalLogout = async () => {
            logout()
            await signOut()
        }
        document.addEventListener('open-global-search', handleOpenSearch)
        document.addEventListener('open-shortcut-help', handleOpenHelp)
        document.addEventListener('universal-logout', handleUniversalLogout)
        return () => {
            document.removeEventListener('open-global-search', handleOpenSearch)
            document.removeEventListener('open-shortcut-help', handleOpenHelp)
            document.removeEventListener('universal-logout', handleUniversalLogout)
        }
    }, [logout])

    // G-chord state for navigation (simple implementation)
    // Ideally this would be more robust, but for minimal complexity:
    // We'll use a small timeout to detect 'g' then 'h'
    const [lastKeyWasG, setLastKeyWasG] = useState(false)

    // --- Global Shortcuts ---

    // 1. Theme Toggle: 't'
    useHotkeys("t", () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }, { enableOnContentEditable: false, enableOnFormTags: false })

    // 2. Search: 'Cmd+K' (or Ctrl+K)
    useHotkeys("mod+k", (e) => {
        e.preventDefault()
        setShowSearch(true)
    }, { enableOnContentEditable: true, enableOnFormTags: true })

    // 3. Show Shortcuts: 'Shift+?'
    useHotkeys("shift+?", () => {
        setShowHelp((prev) => !prev)
    }, { enableOnContentEditable: true, enableOnFormTags: true }) // Allow checking help even while typing

    // 4. Navigation 'g' + ...
    useHotkeys("g", () => {
        setLastKeyWasG(true)
        setTimeout(() => setLastKeyWasG(false), 500) // 500ms window
    })

    useHotkeys("h", () => {
        if (lastKeyWasG) {
            router.push("/dashboard")
            setLastKeyWasG(false)
        }
    })

    useHotkeys("o", () => {
        if (lastKeyWasG) {
            router.push("/settings")
            setLastKeyWasG(false)
        }
    })

    useHotkeys("l", () => {
        if (lastKeyWasG) {
            router.push("/notifications")
            setLastKeyWasG(false)
            return
        }
    })

    // 5. Notifications: 'Shift+B'
    useHotkeys("shift+b", () => {
        document.dispatchEvent(new CustomEvent("toggle-notifications"))
    }, { enableOnContentEditable: true, enableOnFormTags: true })

    // 6. Universal Action: 'n' (Contextual)
    useHotkeys("n", () => {
        document.dispatchEvent(new CustomEvent("universal-new"))
    }, { enableOnContentEditable: false, enableOnFormTags: false })

    // 7. Tab Switching: '1'-'9'
    useHotkeys("1", () => document.dispatchEvent(new CustomEvent("switch-tab", { detail: { index: 0 } })), { enableOnContentEditable: false, enableOnFormTags: false })
    useHotkeys("2", () => document.dispatchEvent(new CustomEvent("switch-tab", { detail: { index: 1 } })), { enableOnContentEditable: false, enableOnFormTags: false })
    useHotkeys("3", () => document.dispatchEvent(new CustomEvent("switch-tab", { detail: { index: 2 } })), { enableOnContentEditable: false, enableOnFormTags: false })
    useHotkeys("4", () => document.dispatchEvent(new CustomEvent("switch-tab", { detail: { index: 3 } })), { enableOnContentEditable: false, enableOnFormTags: false })
    useHotkeys("5", () => document.dispatchEvent(new CustomEvent("switch-tab", { detail: { index: 4 } })), { enableOnContentEditable: false, enableOnFormTags: false })
    useHotkeys("6", () => document.dispatchEvent(new CustomEvent("switch-tab", { detail: { index: 5 } })), { enableOnContentEditable: false, enableOnFormTags: false })
    useHotkeys("7", () => document.dispatchEvent(new CustomEvent("switch-tab", { detail: { index: 6 } })), { enableOnContentEditable: false, enableOnFormTags: false })
    useHotkeys("8", () => document.dispatchEvent(new CustomEvent("switch-tab", { detail: { index: 7 } })), { enableOnContentEditable: false, enableOnFormTags: false })
    useHotkeys("9", () => document.dispatchEvent(new CustomEvent("switch-tab", { detail: { index: 8 } })), { enableOnContentEditable: false, enableOnFormTags: false })

    // 8. Submit Form: 'Cmd+Enter'
    useHotkeys("mod+enter", (e) => {
        const target = e.target as HTMLElement
        // 1. Try finding closest form to the target (focused element)
        let form = target.closest("form")

        // 2. If no form found (e.g. focus on body), check for an open dialog with a form
        if (!form) {
            // Check broadly for an open dialog content
            const openDialog = document.querySelector('[role="dialog"]')
            if (openDialog) {
                form = openDialog.querySelector("form")
            }
        }

        if (form) {
            e.preventDefault()
            form.requestSubmit()
        }
    }, { enableOnContentEditable: true, enableOnFormTags: true })

    // 9. Global Back: 'Esc' (safely)
    useHotkeys("esc", () => {
        // Only navigate back if no dialog/menu is open (Radix handles closing them)
        const isOverlayOpen = !!document.querySelector('[role="dialog"], [role="menu"]')
        const isProjectView = window.location.pathname.includes('/project/')

        if (!isOverlayOpen && isProjectView) {
            router.push('/dashboard')
        }
    })

    return (
        <>
            {children}
            <ShortcutHelpModal open={showHelp} onOpenChange={setShowHelp} />
            <SearchDialog open={showSearch} onOpenChange={setShowSearch} />
        </>
    )
}
