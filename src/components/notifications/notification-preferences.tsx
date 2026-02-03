"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface NotificationPreferences {
    // Email notifications
    email_access_requests: boolean
    email_access_granted: boolean
    email_errors: boolean
    email_activity: boolean
    // In-app notifications
    app_access_requests: boolean
    app_access_granted: boolean
    app_errors: boolean
    app_activity: boolean
    // Digest settings
    digest_frequency: 'none' | 'daily' | 'weekly'
}

const defaultPreferences: NotificationPreferences = {
    email_access_requests: true,
    email_access_granted: true,
    email_errors: true,
    email_activity: false,
    app_access_requests: true,
    app_access_granted: true,
    app_errors: true,
    app_activity: true,
    digest_frequency: 'none'
}

export function NotificationPreferences() {
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences)
    const [initialPreferences, setInitialPreferences] = useState<NotificationPreferences>(defaultPreferences)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        fetchPreferences()
    }, [])

    const fetchPreferences = async () => {
        const supabase = createClient()
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error

            if (data) {
                // Extract only the fields we care about to avoid comparison issues with timestamps
                const cleanPreferences: NotificationPreferences = {
                    email_access_requests: data.email_access_requests,
                    email_access_granted: data.email_access_granted,
                    email_errors: data.email_errors,
                    email_activity: data.email_activity,
                    app_access_requests: data.app_access_requests,
                    app_access_granted: data.app_access_granted,
                    app_errors: data.app_errors,
                    app_activity: data.app_activity,
                    digest_frequency: data.digest_frequency
                }
                setPreferences(cleanPreferences)
                setInitialPreferences(cleanPreferences)
            }
        } catch (error) {
            console.error('Failed to fetch preferences:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const savePreferences = async () => {
        setIsSaving(true)
        const supabase = createClient()

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
                .from('notification_preferences')
                .upsert({
                    user_id: user.id,
                    ...preferences,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error

            setInitialPreferences(preferences)
            toast.success('Preferences saved successfully')
        } catch (error) {
            console.error('Failed to save preferences:', error)
            toast.error('Failed to save preferences')
        } finally {
            setIsSaving(false)
        }
    }

    const updatePreference = <K extends keyof NotificationPreferences>(
        key: K,
        value: NotificationPreferences[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }))
    }

    // Check if there are changes
    const hasChanges = JSON.stringify(preferences) !== JSON.stringify(initialPreferences)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Email Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>
                        Choose what notifications you want to receive via email
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-access-requests">Access Requests</Label>
                            <p className="text-sm text-muted-foreground">
                                When someone requests access to your projects
                            </p>
                        </div>
                        <Switch
                            id="email-access-requests"
                            checked={preferences.email_access_requests}
                            onCheckedChange={(checked) => updatePreference('email_access_requests', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-access-granted">Access Granted</Label>
                            <p className="text-sm text-muted-foreground">
                                When your access requests are approved
                            </p>
                        </div>
                        <Switch
                            id="email-access-granted"
                            checked={preferences.email_access_granted}
                            onCheckedChange={(checked) => updatePreference('email_access_granted', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-errors">Errors & Security</Label>
                            <p className="text-sm text-muted-foreground">
                                Critical errors and security alerts
                            </p>
                        </div>
                        <Switch
                            id="email-errors"
                            checked={preferences.email_errors}
                            onCheckedChange={(checked) => updatePreference('email_errors', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-activity">Activity Updates</Label>
                            <p className="text-sm text-muted-foreground">
                                Project and secret changes
                            </p>
                        </div>
                        <Switch
                            id="email-activity"
                            checked={preferences.email_activity}
                            onCheckedChange={(checked) => updatePreference('email_activity', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* In-App Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle>In-App Notifications</CardTitle>
                    <CardDescription>
                        Choose what notifications appear in the app
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="app-access-requests">Access Requests</Label>
                            <p className="text-sm text-muted-foreground">
                                When someone requests access to your projects
                            </p>
                        </div>
                        <Switch
                            id="app-access-requests"
                            checked={preferences.app_access_requests}
                            onCheckedChange={(checked) => updatePreference('app_access_requests', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="app-access-granted">Access Granted</Label>
                            <p className="text-sm text-muted-foreground">
                                When your access requests are approved
                            </p>
                        </div>
                        <Switch
                            id="app-access-granted"
                            checked={preferences.app_access_granted}
                            onCheckedChange={(checked) => updatePreference('app_access_granted', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="app-errors">Errors & Security</Label>
                            <p className="text-sm text-muted-foreground">
                                Critical errors and security alerts
                            </p>
                        </div>
                        <Switch
                            id="app-errors"
                            checked={preferences.app_errors}
                            onCheckedChange={(checked) => updatePreference('app_errors', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="app-activity">Activity Updates</Label>
                            <p className="text-sm text-muted-foreground">
                                Project and secret changes
                            </p>
                        </div>
                        <Switch
                            id="app-activity"
                            checked={preferences.app_activity}
                            onCheckedChange={(checked) => updatePreference('app_activity', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Digest Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Email Digest</CardTitle>
                    <CardDescription>
                        Receive a summary of notifications at regular intervals
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="digest-frequency">Frequency</Label>
                        <Select
                            value={preferences.digest_frequency}
                            onValueChange={(value: 'none' | 'daily' | 'weekly') =>
                                updatePreference('digest_frequency', value)
                            }
                        >
                            <SelectTrigger id="digest-frequency" className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={savePreferences} disabled={isSaving || !hasChanges}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Preferences
                </Button>
            </div>
        </div>
    )
}
