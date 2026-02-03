"use client"

import { useState, useMemo, Fragment } from 'react'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, CheckCheck, Trash2, MoreHorizontal, Bell, Loader2 } from 'lucide-react'
import { Notification } from '@/lib/types/notifications'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'
import { useRouter } from 'next/navigation'
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
import { NotificationIcon } from './notification-icon'

// Helper to group notifications
type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older'

const getNotificationGroup = (date: Date): DateGroup => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    if (isThisWeek(date)) return 'This Week'
    return 'Older'
}

export function NotificationsList() {
    const { notifications, isLoading, markAsRead, markAllAsRead, deleteMultiple, deleteAllRead, deleteNotification } = useNotificationStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const router = useRouter()

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
        return Object.entries(groups).filter(([_, items]) => items.length > 0) as [DateGroup, Notification[]][]
    }, [notifications, searchQuery])

    // Flatten for selection helpers
    const allFilteredNotifications = useMemo(() =>
        groupedNotifications.flatMap(([_, items]) => items),
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
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading notifications...</p>
            </div>
        )
    }

    if (notifications.length === 0 && !searchQuery) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No notifications</h3>
                <p className="text-muted-foreground mt-1 max-w-sm">
                    You're all caught up! When you receive notifications, they will appear here.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-1 rounded-lg">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    {selectedIds.size > 0 ? (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSelected}
                            className="flex-1 sm:flex-none"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete ({selectedIds.size})
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markAllAsRead()}
                                disabled={notifications.every(n => n.is_read)}
                                className="flex-1 sm:flex-none"
                            >
                                <CheckCheck className="h-4 w-4 mr-2" />
                                Mark all read
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteAllRead()}
                                disabled={!notifications.some(n => n.is_read)}
                                className="flex-1 sm:flex-none"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear read
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Notifications Table */}
            <div className="border rounded-lg overflow-hidden bg-card">
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
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
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
        </div>
    )
}
