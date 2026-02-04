"use client"

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut } from "@/app/actions"
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { NotificationsList } from '@/components/notifications/notifications-list'
import { useEnvaultStore } from '@/lib/store'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function NotificationsPage() {
    const router = useRouter()
    const { user } = useEnvaultStore()

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
                <div className="container mx-auto py-3 sm:py-4 px-3 sm:px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="shrink-0">
                            <ArrowLeft style={{ width: '20px', height: '20px' }} className="sm:w-6 sm:h-6" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl font-semibold truncate">Notifications</h1>
                            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage all your notifications</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <AnimatedThemeToggler />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full ml-2">
                                    <UserAvatar
                                        user={{
                                            email: user?.email,
                                            avatar: user?.avatar,
                                            firstName: user?.firstName
                                        }}
                                        className="h-8 w-8"
                                    />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.firstName || "User"}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{user?.email || "user@example.com"}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="cursor-pointer flex w-full items-center">
                                        <SettingsIcon className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 dark:text-red-500 focus:text-red-600 dark:focus:text-red-500 cursor-pointer" onClick={() => {
                                    const { logout } = useEnvaultStore.getState()
                                    logout()
                                    signOut()
                                }}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-7xl">
                <NotificationsList />
            </main>
        </div>
    )
}
