import { ShieldCheck } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { Scene } from "@/components/landing/Scene"
import { Link } from "next-view-transitions"

interface AuthLayoutProps {
    children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative overflow-hidden font-sans blueprint-grid sharp">
            {/* Header - Logo & Theme Toggler */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 md:p-8">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                    <h1 className="text-4xl font-bold tracking-tight text-primary font-serif">Envault</h1>
                </Link>
                <AnimatedThemeToggler />
            </div>

            {/* LEFT COLUMN: Visuals / Brand */}
            <div className="hidden lg:flex flex-col justify-center p-8 lg:p-12 relative overflow-hidden text-muted-foreground pointer-events-none">
                {/* Illustration Area */}
                <div className="z-10 flex flex-col items-center justify-center relative h-full">
                    <div className="flex-1 w-full flex items-center justify-center">
                        {/* Empty space for the 3D Scene to occupy visually */}
                    </div>
                    <p className="mt-8 text-lg font-medium text-center max-w-sm text-foreground/80 pb-12">
                        Securely manage your environment variables with end-to-end encryption.
                    </p>
                </div>
            </div>

            {/* RIGHT COLUMN: Auth Form */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-8 lg:p-24 relative z-10 animate-in fade-in slide-in-from-top-8 duration-1000 ease-out">
                {children}
            </div>

            {/* 3D Background */}
            <div className="absolute inset-y-0 left-0 w-1/2 hidden lg:block pointer-events-none z-0">
                <Scene isAuthPage={true} />
            </div>
        </main>
    )
}
