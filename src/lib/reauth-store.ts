import { create } from 'zustand'

interface ReauthStore {
    isOpen: boolean
    isLocked: boolean
    onSuccess?: () => void
    openReauth: (onSuccess?: () => void) => void
    closeReauth: () => void
    setLocked: (locked: boolean) => void
}

export const useReauthStore = create<ReauthStore>((set) => ({
    isOpen: false,
    isLocked: false,
    onSuccess: undefined,
    openReauth: (onSuccess) => set({ isOpen: true, onSuccess }),
    closeReauth: () => set({ isOpen: false, onSuccess: undefined }),
    setLocked: (locked) => set({ isLocked: locked, isOpen: locked }), // Auto-open dialog when locked
}))
