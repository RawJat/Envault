import * as Icons from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { NotificationVariant } from '@/lib/types/notifications'
import { cn } from '@/lib/utils'

interface NotificationIconProps {
    iconName: string
    variant?: NotificationVariant
    className?: string
}

export function NotificationIcon({
    iconName,
    variant = 'default',
    className = ''
}: NotificationIconProps) {
    // Dynamically get the icon component
    const Icon = (Icons[iconName as keyof typeof Icons] as LucideIcon) || Icons.Bell

    // Variant color mapping
    const variantColors = {
        default: 'text-foreground',
        success: 'text-green-500',
        warning: 'text-yellow-500',
        error: 'text-red-500',
        info: 'text-blue-500'
    }

    return (
        <div className={cn('flex-shrink-0', className)}>
            <Icon className={cn('h-5 w-5', variantColors[variant])} />
        </div>
    )
}
