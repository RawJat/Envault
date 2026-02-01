"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Smartphone, Laptop, Trash2, Calendar, Clock } from "lucide-react"
import { toast } from "sonner"
import { getPersonalAccessTokens, revokePersonalAccessToken } from "@/app/actions"
import { formatDistanceToNow } from "date-fns"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Token {
    id: string
    name: string
    last_used_at: string | null
    expires_at: string | null
    metadata: {
        platform?: string
        type?: string
        release?: string
        hostname?: string
    } | null
}

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { signInWithGoogle, signInWithGithub } from "@/app/actions"
import { User } from "@/lib/store"
// actually I'll just rely on what I see in settings-view.tsx

export function SecurityTab({ user }: { user: any }) {
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTokens = async () => {
        setLoading(true)
        const result = await getPersonalAccessTokens()
        if (result.error) {
            toast.error(result.error)
        } else {
            setTokens(result.tokens || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchTokens()
    }, [])

    const handleRevoke = async (id: string) => {
        const result = await revokePersonalAccessToken(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Token revoked")
            fetchTokens() // Refresh list
        }
    }

    const getDeviceIcon = (metadata: Token['metadata']) => {
        const platform = metadata?.platform || '';
        if (platform === 'darwin' || platform.includes('mac')) return <Laptop className="w-5 h-5" />;
        if (platform === 'win32' || platform.includes('win')) return <Laptop className="w-5 h-5" />;
        return <Shield className="w-5 h-5" />; // Default
    }

    const getDeviceName = (token: Token) => {
        const hostname = token.metadata?.hostname;
        const osType = token.metadata?.type;
        const osRelease = token.metadata?.release;

        if (hostname) {
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{hostname}</span>
                    <span className="text-xs text-muted-foreground">
                        {osType} {osRelease}
                    </span>
                </div>
            )
        }
        return <span className="font-medium">{token.name}</span>
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-medium">Security & Devices</h2>
                <p className="text-sm text-muted-foreground">
                    Manage your security preferences and connected devices.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Connected Accounts</CardTitle>
                    <CardDescription>
                        Manage your social login providers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-md bg-card">
                        <div className="flex items-center gap-3">
                            <div className="bg-white dark:bg-muted p-1.5 rounded-full border shadow-sm flex items-center justify-center h-8 w-8">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Google</Label>
                                <p className="text-xs text-muted-foreground">
                                    {user?.authProviders?.includes('google') ? "Connected to Google" : "Not connected"}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={user?.authProviders?.includes('google')}
                            disabled={user?.authProviders?.includes('google')}
                            onCheckedChange={(checked) => {
                                if (checked) signInWithGoogle()
                            }}
                            aria-label="Toggle Google connection"
                            className="data-[state=checked]:bg-green-500"
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-md bg-card">
                        <div className="flex items-center gap-3">
                            <div className="bg-white dark:bg-muted p-1.5 rounded-full border shadow-sm flex items-center justify-center h-8 w-8">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">GitHub</Label>
                                <p className="text-xs text-muted-foreground">
                                    {user?.authProviders?.includes('github') ? "Connected to GitHub" : "Not connected"}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={user?.authProviders?.includes('github')}
                            disabled={user?.authProviders?.includes('github')}
                            onCheckedChange={(checked) => {
                                if (checked) signInWithGithub()
                            }}
                            aria-label="Toggle GitHub connection"
                            className="data-[state=checked]:bg-green-500"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Connected Devices (CLI)</CardTitle>
                    <CardDescription>
                        These devices have access to your Envault projects via the CLI.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-sm text-muted-foreground">Loading devices...</div>
                    ) : tokens.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No connected devices found.</div>
                    ) : (
                        <div className="space-y-4">
                            {tokens.map((token) => (
                                <div key={token.id} className="flex items-start justify-between p-4 border rounded-lg bg-card gap-3">
                                    <div className="p-2 bg-secondary rounded-full shrink-0 mt-0.5">
                                        {getDeviceIcon(token.metadata)}
                                    </div>

                                    <div className="flex-1 min-w-0 mr-2">
                                        {getDeviceName(token)}
                                        <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">Active: {token.last_used_at ? formatDistanceToNow(new Date(token.last_used_at), { addSuffix: true }) : 'Never'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">Expires: {token.expires_at ? formatDistanceToNow(new Date(token.expires_at), { addSuffix: true }) : 'Never'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="shrink-0">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive -mt-1 -mr-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Revoke Access?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to revoke access for <strong>{token.name}</strong>?
                                                        This device will no longer be able to access your projects until you log in again.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRevoke(token.id)} className="bg-destructive text-destructive-foreground">
                                                        Revoke Access
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
