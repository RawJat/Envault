"use client"

import { useEffect, useRef } from "react"

// Modifier keys map
const MODIFIERS = {
    ctrl: (e: KeyboardEvent) => e.ctrlKey,
    shift: (e: KeyboardEvent) => e.shiftKey,
    alt: (e: KeyboardEvent) => e.altKey,
    meta: (e: KeyboardEvent) => e.metaKey,
    mod: (e: KeyboardEvent) => e.metaKey || e.ctrlKey, // Cmd on Mac, Ctrl on Win
}

type Modifier = keyof typeof MODIFIERS

interface Options {
    enabled?: boolean
    preventDefault?: boolean
    enableOnContentEditable?: boolean
    enableOnFormTags?: boolean
}

const DEFAULT_OPTIONS: Options = {
    enabled: true,
    preventDefault: true,
    enableOnContentEditable: false,
    enableOnFormTags: false,
}

export function useHotkeys(
    keyCombo: string,
    callback: (e: KeyboardEvent) => void,
    options: Options = {}
) {
    const { enabled, preventDefault, enableOnContentEditable, enableOnFormTags } = {
        ...DEFAULT_OPTIONS,
        ...options,
    }

    // Keep a ref to the callback to avoid re-binding the event listener on every render
    const callbackRef = useRef(callback)
    useEffect(() => {
        callbackRef.current = callback
    }, [callback])

    useEffect(() => {
        if (!enabled) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Parse the key combo
            const keys = keyCombo.toLowerCase().split("+").map(k => k.trim())
            const mainKey = keys[keys.length - 1]
            const requiredModifiers = keys.slice(0, -1) as Modifier[]

            // Check modifiers
            const modifiersMatch = requiredModifiers.every((mod) => {
                const check = MODIFIERS[mod]
                if (!check) return false
                return check(e)
            })

            // Check exact modifiers (ensure no EXTRA modifiers are pressed)
            // This is a simple implementation; complex one would check all possible modifiers
            // For now, if we ask for 'shift+k', we want shift+k. 
            // If user holds 'ctrl+shift+k', it might trigger 'shift+k' which is usually fine,
            // but stricter checks might be needed for conflicts. 
            // Let's stick to "required match" for now.

            if (!modifiersMatch) return

            // Check the main key
            // e.key is case sensitive (K vs k). We lower case everything for comparison.
            const keyMatch = e.key.toLowerCase() === mainKey

            // On Mac, Option + Key often produces a different character (e.g. Option+X -> ≈)
            // We check e.code as a fallback if Alt is involved.
            const codeFallbackMatch = e.altKey && e.code.toLowerCase() === `key${mainKey}`

            if (!keyMatch && !codeFallbackMatch) return

            // Check for input focus safety
            const target = e.target as HTMLElement
            const isInput =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "SELECT" ||
                target.isContentEditable

            if (isInput) {
                if (!enableOnFormTags && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return
                if (!enableOnContentEditable && target.isContentEditable) return
            }

            if (preventDefault) {
                e.preventDefault()
            }

            callbackRef.current(e)
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [keyCombo, enabled, preventDefault, enableOnContentEditable, enableOnFormTags])
}
