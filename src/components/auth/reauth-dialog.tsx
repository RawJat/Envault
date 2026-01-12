'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Lock, Mail, KeyRound, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useEnvaultStore } from '@/lib/store'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useReauthStore } from '@/lib/reauth-store'
import { sendReauthCode, verifyReauthCode } from '@/app/reauth-actions'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
    InputOTPSeparator,
} from "@/components/ui/input-otp"

const codeSchema = z.object({
    code: z.string().length(8, 'Code must be 8 digits'),
})

type CodeValues = z.infer<typeof codeSchema>

export function ReauthDialog() {
    const { isOpen, isLocked, closeReauth, setLocked, onSuccess } = useReauthStore()
    const { user } = useEnvaultStore()
    const [step, setStep] = useState<'send' | 'verify'>('send')
    const [isSending, setIsSending] = useState(false)

    // Ensure we have an email. If for some reason we don't, we can't really re-auth this way.
    // In a real app, you might want to handle this edge case better.
    const email = user?.email || ""

    const {
        register, // Not strictly needed for InputOTP but available if we switched fields
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CodeValues>({
        resolver: zodResolver(codeSchema),
        defaultValues: {
            code: "",
        },
    })

    const handleSendCode = async () => {
        setIsSending(true)
        const result = await sendReauthCode(email)
        setIsSending(false)

        if (result.error) {
            toast.error(result.error)
            return
        }

        toast.success("Verification code sent")
        setStep('verify')
    }

    async function onVerify(data: CodeValues) {
        const result = await verifyReauthCode(email, data.code)

        if (result.error) {
            toast.error(result.error)
            return
        }

        toast.success("Identity verified")

        // Reset state
        setStep('send')
        reset()
        closeReauth()

        // Execute the pending action
        if (onSuccess) {
            onSuccess()
        }

        // If locked, unlock
        if (isLocked) {
            setLocked(false)
        }
    }

    const handleClose = (open: boolean) => {
        if (isLocked) return // Cannot close if locked

        if (!open) {
            closeReauth()
            setTimeout(() => {
                setStep('send')
                reset()
            }, 300)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-primary" />
                        {isLocked ? "Session Locked" : "Authentication Required"}
                    </DialogTitle>
                    <DialogDescription>
                        {isLocked
                            ? "Your session has timed out due to inactivity. Please re-authenticate."
                            : (step === 'send'
                                ? "For your security, please verify your identity to continue."
                                : `Enter the code sent to ${email}`
                            )
                        }
                    </DialogDescription>
                </DialogHeader>

                {step === 'send' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Mail className="w-5 h-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Email Verification</p>
                                <p className="text-xs text-muted-foreground break-all">
                                    We'll send a code to <span className="font-mono text-foreground">{email}</span>
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            {!isLocked && (
                                <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                                    Cancel
                                </Button>
                            )}
                            <Button onClick={handleSendCode} disabled={isSending || !email}>
                                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Code
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === 'verify' && (
                    <form onSubmit={handleSubmit(onVerify)} className="space-y-6">
                        <div className="space-y-2 flex flex-col items-center justify-center">
                            <Label htmlFor="code" className="sr-only">Verification Code</Label>
                            <InputOTP
                                maxLength={8}
                                value={watch('code')}
                                onChange={(value) => setValue('code', value)}
                                containerClassName="gap-1 sm:gap-2"
                            >
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} className="w-8 h-8 sm:w-10 sm:h-10" />
                                    <InputOTPSlot index={1} className="w-8 h-8 sm:w-10 sm:h-10" />
                                    <InputOTPSlot index={2} className="w-8 h-8 sm:w-10 sm:h-10" />
                                    <InputOTPSlot index={3} className="w-8 h-8 sm:w-10 sm:h-10" />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                    <InputOTPSlot index={4} className="w-8 h-8 sm:w-10 sm:h-10" />
                                    <InputOTPSlot index={5} className="w-8 h-8 sm:w-10 sm:h-10" />
                                    <InputOTPSlot index={6} className="w-8 h-8 sm:w-10 sm:h-10" />
                                    <InputOTPSlot index={7} className="w-8 h-8 sm:w-10 sm:h-10" />
                                </InputOTPGroup>
                            </InputOTP>
                            {errors.code && (
                                <p className="text-xs text-destructive">{errors.code.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                Check your email for the 8-digit code.
                            </p>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="sm:flex-1"
                                onClick={() => setStep('send')}
                                disabled={isSubmitting}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <div className="flex-1"></div>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
