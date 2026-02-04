import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMac() {
  if (typeof window === "undefined") return false

  // Check root element first for server-synced value
  const dataOs = document.documentElement.getAttribute('data-os')
  if (dataOs) return dataOs === 'mac'

  // Fallback
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform)
}

export function getModifierKey(modifier: 'mod' | 'alt' | 'shift' | 'ctrl') {
  const mac = isMac()
  switch (modifier) {
    case 'mod': return mac ? '⌘' : 'Ctrl'
    case 'alt': return mac ? '⌥' : 'Alt'
    case 'ctrl': return mac ? '⌃' : 'Ctrl'
    case 'shift': return mac ? 'Shift' : 'Shift'
    default: return ''
  }
}
