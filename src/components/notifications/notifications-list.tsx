"use client"

import { useState, useMemo, Fragment, useEffect } from 'react'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, CheckCheck, Trash2, MoreHorizontal, Bell, CornerDownLeft } from 'lucide-react'
import { Notification } from '@/lib/types/notifications'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { Kbd } from '@/components/ui/kbd'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { NotificationIcon } from './notification-icon'
import { NotificationListSkeleton } from './notification-skeleton'

// Helper to group notifications
type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older'

const getNotificationGroup = (date: Date): DateGroup => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    if (isThisWeek(date)) return 'This Week'
    return 'Older'
}

export function NotificationsList() {
    const { notifications, isLoading, markAsRead, markAllAsRead, deleteMultiple, deleteAllRead, deleteNotification, fetchNotifications } = useNotificationStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const router = useRouter()

    // Fetch notifications on mount
    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    // Filter and Group notifications
    const groupedNotifications = useMemo(() => {
        let filtered = notifications

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(n =>
                n.title.toLowerCase().includes(query) ||
                n.message.toLowerCase().includes(query)
            )
        }

        // Group by date
        const groups: Record<DateGroup, Notification[]> = {
            'Today': [],
            'Yesterday': [],
            'This Week': [],
            'Older': []
        }

        filtered.forEach(notification => {
            const date = new Date(notification.created_at)
            const group = getNotificationGroup(date)
            groups[group].push(notification)
        })

        // Remove empty groups and return as array of [groupName, items]
        return Object.entries(groups).filter((entry) => entry[1].length > 0) as [DateGroup, Notification[]][]
    }, [notifications, searchQuery])

    // Flatten for selection helpers
    const allFilteredNotifications = useMemo(() =>
        groupedNotifications.flatMap(([, items]) => items),
        [groupedNotifications]
    )

    // Selection handlers
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === allFilteredNotifications.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(allFilteredNotifications.map(n => n.id)))
        }
    }

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return
        deleteMultiple(Array.from(selectedIds))
        setSelectedIds(new Set())
    }

    // Shortcuts
    useHotkeys("m", () => {
        if (!selectedIds.size && !notifications.every(n => n.is_read)) markAllAsRead()
    }, { enableOnContentEditable: false, enableOnFormTags: false })

    useHotkeys("c", () => {
        if (!selectedIds.size && notifications.some(n => n.is_read)) deleteAllRead()
    }, { enableOnContentEditable: false, enableOnFormTags: false })

    useHotkeys("enter", () => {
        if (selectedIds.size > 0) handleDeleteSelected()
    }, { enableOnContentEditable: false, enableOnFormTags: false })



    const handleRowClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id)
        }

        if (notification.action_url) {
            router.push(notification.action_url)
        }
    }

    const handleDeleteSingle = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        deleteNotification(id)
    }

    const allSelected = allFilteredNotifications.length > 0 && selectedIds.size === allFilteredNotifications.length
    const someSelected = selectedIds.size > 0 && selectedIds.size < allFilteredNotifications.length

    if (isLoading && notifications.length === 0) {
        return <NotificationListSkeleton />
    }

    if (notifications.length === 0 && !searchQuery) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No notifications</h3>
                <p className="text-muted-foreground mt-1 max-w-sm">
                    You&apos;re all caught up! When you receive notifications, they will appear here.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 bg-card rounded-lg">
                <div className="relative w-50%">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background"
                    />
                </div>

                <div className="flex gap-2">
                    {selectedIds.size > 0 ? (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSelected}
                            className="flex-1 flex items-center gap-2"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete ({selectedIds.size}) <span className="hidden md:inline-flex ml-2"><Kbd variant="primary" size="xs"><CornerDownLeft className="w-3 h-3" /></Kbd></span>
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markAllAsRead()}
                                disabled={notifications.every(n => n.is_read)}
                                className="flex-1 flex items-center gap-2"
                            >
                                <CheckCheck className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Mark all read</span>
                                <span className="sm:hidden">Mark all</span>
                                <Kbd size="xs" className="ml-2">M</Kbd>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteAllRead()}
                                disabled={!notifications.some(n => n.is_read)}
                                className="flex-1 flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Clear read</span>
                                <span className="sm:hidden">Clear</span>
                                <Kbd size="xs" className="ml-2">C</Kbd>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Notifications - Desktop Table / Mobile Cards */}
            <div className="border rounded-lg overflow-hidden bg-card">
                {/* Desktop Table View - Hidden on Mobile */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={toggleSelectAll}
                                        className={cn(someSelected && "data-[state=checked]:bg-muted-foreground")}
                                    />
                                </TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Notification</TableHead>
                                <TableHead className="w-[150px] text-right">Time</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedNotifications.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No results found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                groupedNotifications.map(([group, items]) => (
                                    <Fragment key={group}>
                                        {/* Group Boundary */}
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableCell colSpan={5} className="py-2 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                                {group}
                                            </TableCell>
                                        </TableRow>

                                        {/* Group Items */}
                                        {items.map((notification) => (
                                            <TableRow
                                                key={notification.id}
                                                className={cn(
                                                    "cursor-pointer transition-colors hover:bg-muted/50",
                                                    !notification.is_read ? "bg-primary/5" : ""
                                                )}
                                                onClick={() => handleRowClick(notification)}
                                            >
                                                <TableCell className="w-[50px]" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedIds.has(notification.id)}
                                                        onCheckedChange={() => toggleSelection(notification.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="w-[50px] py-4">
                                                    <NotificationIcon
                                                        iconName={notification.icon}
                                                        variant={notification.variant}
                                                        className="mt-0"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={cn("text-sm transition-all", !notification.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                                                            {notification.title}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground line-clamp-1">
                                                            {notification.message}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-4 text-xs text-muted-foreground whitespace-nowrap">
                                                    <TooltipProvider>
                                                        <Tooltip delayDuration={300}>
                                                            <TooltipTrigger asChild>
                                                                <span className="cursor-help">
                                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{format(new Date(notification.created_at), "PPpp")}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {!notification.is_read && (
                                                                <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                                                    <CheckCheck className="h-4 w-4 mr-2" />
                                                                    Mark as read
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                onClick={(e) => handleDeleteSingle(e, notification.id)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View - Hidden on Desktop */}
                <div className="md:hidden">
                    {groupedNotifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No results found.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {groupedNotifications.map(([group, items]) => (
                                <div key={group} className="space-y-2 p-3">
                                    {/* Group Header */}
                                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1 bg-muted/30 rounded">
                                        {group}
                                    </h3>

                                    {/* Group Items as Cards */}
                                    <div className="space-y-2">
                                        {items.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={cn(
                                                    "p-3 rounded-lg border transition-colors",
                                                    !notification.is_read ? "bg-primary/5 border-primary/20" : "bg-card hover:bg-muted/30"
                                                )}
                                                onClick={() => handleRowClick(notification)}
                                            >
                                                {/* Card Header */}
                                                <div className="flex items-start gap-3 mb-2">
                                                    <Checkbox
                                                        checked={selectedIds.has(notification.id)}
                                                        onCheckedChange={() => toggleSelection(notification.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="mt-1"
                                                    />
                                                    <NotificationIcon
                                                        iconName={notification.icon}
                                                        variant={notification.variant}
                                                        className="mt-0 shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={cn(
                                                            "text-sm mb-1",
                                                            !notification.is_read ? "font-semibold" : "font-medium text-foreground/80"
                                                        )}>
                                                            {notification.title}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Card Footer */}
                                                <div className="flex items-center justify-between pl-12">
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                    </span>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {!notification.is_read && (
                                                                <DropdownMenuItem onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    markAsRead(notification.id)
                                                                }}>
                                                                    <CheckCheck className="h-4 w-4 mr-2" />
                                                                    Mark as read
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                onClick={(e) => handleDeleteSingle(e, notification.id)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
