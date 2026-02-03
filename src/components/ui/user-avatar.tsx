"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps extends React.ComponentPropsWithoutRef<typeof Avatar> {
    user: {
        email?: string
        avatar?: string
        firstName?: string
        lastName?: string
        name?: string // For cases where we just have a full name
    }
    avatarSeed?: string // Optional override for generating the avatar
    fallbackType?: "dicebear" | "initials"
}

export function UserAvatar({ user, className, avatarSeed, fallbackType = "dicebear", ...props }: UserAvatarProps) {
    const email = user.email || "unknown"
    const name = user.name || user.firstName || "User"
    const initials = (name.slice(0, 2)).toUpperCase()

    // DiceBear URL (Notionists style)
    // We use the email (or provided seed) to ensure consistent generation
    const seed = avatarSeed || email
    const dicebearUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`

    return (
        <Avatar className={cn("h-8 w-8", className)} {...props}>
            {user.avatar ? (
                <AvatarImage src={user.avatar} alt={name} />
            ) : fallbackType === "dicebear" ? (
                // If using DiceBear, we pass it as the image source
                <AvatarImage src={dicebearUrl} alt={name} />
            ) : null}

            <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
    )
}
