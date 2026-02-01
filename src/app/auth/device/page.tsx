
'use client'

import { useState } from 'react'
import { verifyDeviceCode } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function DeviceAuthPage() {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Add hyphen if missing for UX? Or assume user types it.
        // Let's enforce format or auto-format. For now, simple.

        const result = await verifyDeviceCode(code)

        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
        } else {
            setSuccess(true)
            toast.success('Device authenticated successfully!')
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-background">
                <Card className="w-full max-w-md border-green-500/50 bg-green-500/10 dark:bg-green-500/5">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl text-green-700 dark:text-green-400">Success!</CardTitle>
                        <CardDescription className="text-green-600/90 dark:text-green-500/90">
                            You have successfully authenticated your CLI session.
                            You can now close this window and return to your terminal.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Connect CLI</CardTitle>
                    <CardDescription>
                        Enter the 8-character code displayed in your terminal to authenticate.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    placeholder="ABCD-1234"
                                    className="text-center text-2xl tracking-widest uppercase font-mono h-14"
                                    maxLength={9}
                                    value={code}
                                    onChange={(e) => {
                                        let val = e.target.value.toUpperCase()
                                        // Auto-insert hyphen
                                        if (val.length === 4 && code.length === 3) {
                                            val = val + '-'
                                        }
                                        setCode(val)
                                    }}
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" type="submit" disabled={loading || code.length < 9}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
