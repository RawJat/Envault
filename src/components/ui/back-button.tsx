"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { pushWithTransition } from "@/lib/utils/view-transition-navigation"

export function BackButton() {
    const router = useRouter()

    const handleGoBack = () => {
        if (typeof window === 'undefined') {
            pushWithTransition(router, "/dashboard", "nav-back")
            return
        }

        const hasHistory = window.history.length > 1
        const referrer = document.referrer
        const isInternalReferrer =
            !!referrer && new URL(referrer).origin === window.location.origin

        if (hasHistory && isInternalReferrer) {
            const referrerPath = new URL(referrer).pathname + new URL(referrer).search
            pushWithTransition(router, referrerPath || "/dashboard", "nav-back")
        } else {
            pushWithTransition(router, "/dashboard", "nav-back")
        }
    }

    return (
        <Button
            onClick={handleGoBack}
            variant="outline"
            size="lg"
            className="group"
        >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Go Back
        </Button>
    )
}
