"use client"

import Link from "next/link"
import { useEnvaultStore } from "@/lib/store"
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog"
import { ProjectCard } from "@/components/dashboard/project-card"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { ShieldCheck, Settings as SettingsIcon, LogOut, Share2, Search, Keyboard } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { getModifierKey } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { signOut } from "@/app/actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"

export default function DashboardPage() {
    const projects = useEnvaultStore((state) => state.projects)
    const { user, logout, isLoading } = useEnvaultStore()
    const [activeTab, setActiveTab] = useState("my-projects")
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const searchParams = useSearchParams()
    const router = useRouter()
    const requested = searchParams.get('requested')
    const approved = searchParams.get('approved')
    const denied = searchParams.get('denied')

    // Function to refresh projects
    const refreshProjects = useCallback(async () => {
        const { getProjects } = await import('@/app/project-actions')
        const result = await getProjects(true) // bypass cache
        if (result.data) {
            const setProjects = useEnvaultStore.getState().setProjects
            setProjects(result.data as any)
        }
    }, [])

    useEffect(() => {
        setMounted(true)
        if (requested === 'true') {
            toast.success("Access request sent!", {
                description: "The project owner will be notified of your request.",
                duration: 5000,
            })
        } else if (approved === 'true') {
            toast.success("Access request approved!", {
                description: "The user has been added to the project.",
                duration: 5000,
            })
            // Refresh projects to update roles after approval
            refreshProjects()
        } else if (denied === 'true') {
            toast.info("Access request denied.", {
                description: "The request has been removed.",
                duration: 5000,
            })
        }

        if (requested || approved || denied) {
            // Clear the params from URL
            const url = new URL(window.location.href)
            url.searchParams.delete('requested')
            url.searchParams.delete('approved')
            url.searchParams.delete('denied')
            router.replace(url.pathname + url.search)
        }

        // Listen for project role changes
        const handleProjectRoleChanged = () => {
            // Refresh projects with updated roles
            refreshProjects()
        }

        // Refresh projects when window regains focus (in case permissions changed elsewhere)
        const handleWindowFocus = () => {
            refreshProjects()
        }

        document.addEventListener('project-role-changed', handleProjectRoleChanged)
        window.addEventListener('focus', handleWindowFocus)

        return () => {
            document.removeEventListener('project-role-changed', handleProjectRoleChanged)
            window.removeEventListener('focus', handleWindowFocus)
        }
    }, [requested, approved, denied, router])

    // Shortcuts
    useEffect(() => {
        const handleNew = () => setIsCreateDialogOpen(true)
        const handleSwitch = (e: Event) => {
            const index = (e as CustomEvent).detail.index
            if (index === 0) setActiveTab("my-projects")
            if (index === 1) setActiveTab("shared-with-me")
        }

        document.addEventListener('universal-new', handleNew)
        document.addEventListener('switch-tab', handleSwitch)

        return () => {
            document.removeEventListener('universal-new', handleNew)
            document.removeEventListener('switch-tab', handleSwitch)
        }
    }, [])

    const handleLogout = async () => {
        logout()
        await signOut()
    }

    if (!mounted) {
        return null // Or a more elaborate skeleton if desired
    }

    // Filter Projects
    const myProjects = projects.filter(p => p.role === 'owner' || p.role === 'editor')
    const sharedProjects = projects.filter(p => p.role === 'viewer' && p.user_id !== user?.id)

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
                <div className="container mx-auto py-4 px-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                        <span className="font-bold text-2xl font-serif">Envault</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-muted-foreground hidden md:flex items-center gap-2 h-9"
                            onClick={() => {
                                document.dispatchEvent(new CustomEvent('open-global-search'))
                            }}
                        >
                            <Search className="w-4 h-4" />
                            Search...
                            <div className="ml-2 hidden md:flex items-center gap-1">
                                <Kbd size="xs">{getModifierKey('mod')}</Kbd>
                                <Kbd size="xs">K</Kbd>
                            </div>
                        </Button>
                        <AnimatedThemeToggler />
                        <NotificationDropdown />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
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
                                        <div className="ml-auto hidden md:flex items-center gap-1">
                                            <Kbd size="xs">G</Kbd>
                                            <Kbd size="xs">O</Kbd>
                                        </div>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => document.dispatchEvent(new CustomEvent('open-shortcut-help'))}
                                >
                                    <Keyboard className="mr-2 h-4 w-4" />
                                    <span>Keyboard Shortcuts</span>
                                    <div className="ml-auto hidden md:flex items-center gap-1">
                                        <Kbd size="xs">Shift</Kbd>
                                        <Kbd size="xs">?</Kbd>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 dark:text-red-500 focus:text-red-600 dark:focus:text-red-500 cursor-pointer" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="container mx-auto py-8 px-4">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                        <p className="text-muted-foreground">Manage your environment variables securely.</p>
                    </div>
                    <CreateProjectDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="my-projects" className="flex items-center gap-2">
                            My Projects<Kbd size="xs">1</Kbd>
                        </TabsTrigger>
                        <TabsTrigger value="shared-with-me" className="flex items-center gap-2">
                            Shared with Me<Kbd size="xs">2</Kbd>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="my-projects">
                        {isLoading ? (
                            <ProjectSkeletonGrid />
                        ) : myProjects.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                                {myProjects.map((project) => (
                                    <ProjectCard key={project.id} project={project} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="shared-with-me">
                        {isLoading ? (
                            <ProjectSkeletonGrid />
                        ) : sharedProjects.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed rounded-xl">
                                <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium">No shared projects</h3>
                                <p className="text-muted-foreground mb-4">You haven&apos;t been invited to any projects yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                                {sharedProjects.map((project) => (
                                    <ProjectCard key={project.id} project={project} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div >
    )
}

export function ProjectSkeletonGrid() {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col rounded-xl border bg-card text-card-foreground shadow h-full min-h-[12rem] relative overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 w-full bg-muted/20 border-t p-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <div className="h-12" /> {/* Spacer for footer */}
                </div>
            ))}
        </div>
    )
}

function EmptyState() {
    return (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="text-muted-foreground mb-4">Create your first project to get started.</p>
            <div className="inline-block">
                <CreateProjectDialog />
            </div>
        </div>
    )
}
