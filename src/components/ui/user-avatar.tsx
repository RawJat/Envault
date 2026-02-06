"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps extends React.ComponentPropsWithoutRef<typeof Avatar> {
    user?: {
        email?: string
        avatar?: string
        firstName?: string
        lastName?: string
        name?: string // For cases where we just have a full name
        username?: string // Username field
    }
    userId?: string // Alternative to user object - just the ID (deprecated, avoid using)
    email?: string // Email for the user
    avatar?: string // Direct avatar URL
    avatarSeed?: string // Optional override for generating the avatar
    fallbackType?: "dicebear" | "initials"
}

export function UserAvatar({ user, userId, email: propEmail, avatar: propAvatar, className, avatarSeed, fallbackType = "dicebear", ...props }: UserAvatarProps) {
    // Determine the values to use
    const email = propEmail || user?.email || ""
    const avatar = propAvatar || user?.avatar
    
    // Use username if available, otherwise email for display name
    const displayName = user?.username || user?.name || user?.firstName || email.split('@')[0] || email || "User"
    const initials = (displayName.slice(0, 2)).toUpperCase()

    // Use username or email for seeding (avoid userId for privacy)
    const seed = avatarSeed || user?.username || email || "user"
    const dicebearUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`

    const [imageError, setImageError] = React.useState(false)

    const handleImageError = () => {
        setImageError(true)
    }

    return (
        <Avatar className={cn("h-8 w-8", className)} {...props}>
            {avatar && !imageError ? (
                <AvatarImage src={avatar} alt={displayName} onError={handleImageError} />
            ) : fallbackType === "dicebear" ? (
                // If using DiceBear, we pass it as the image source
                <AvatarImage src={dicebearUrl} alt={displayName} />
            ) : null}

            <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
    )
}
