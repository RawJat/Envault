"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, Shield, Wifi, Zap } from "lucide-react"


// Module-level variable to track if loader has shown in this session
// We use a simple variable so it persists across client-side navigations but resets on hard refresh.
let hasShown = false

const loadingStates = [
    { text: "ESTABLISHING SECURE CONNECTION", icon: Wifi },
    { text: "VERIFYING ENCRYPTION KEYS", icon: Lock },
    { text: "SYNCING NEURAL VAULT", icon: Zap },
    { text: "ACCESS GRANTED", icon: Shield },
]

export function Preloader() {
    // Logic: If hasShown is true, we simply don't render (isLoading = false).
    // If hasShown is false, we start loading.
    const [isLoading, setIsLoading] = useState(!hasShown)
    const [currentState, setCurrentState] = useState(0)

    useEffect(() => {
        if (hasShown) return

        // Disable scroll
        document.body.style.overflow = "hidden"

        // Cycle through states
        const interval = setInterval(() => {
            setCurrentState((prev) => {
                if (prev >= loadingStates.length - 1) return prev
                return prev + 1
            })
        }, 600) // Change state every 600ms

        // Finish loading
        const timeout = setTimeout(() => {
            setIsLoading(false)
            hasShown = true
            document.body.style.overflow = "unset"
        }, 2400) // Total time

        return () => {
            document.body.style.overflow = "unset"
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [])

    return (
        <AnimatePresence>
            {isLoading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    {/* Left Door */}
                    <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1/2 bg-background border-r border-border/50"
                        initial={{ x: 0 }}
                        exit={{ x: "-100%", transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(245,158,11,0.03)_50%,transparent)]" />
                    </motion.div>

                    {/* Right Door */}
                    <motion.div
                        className="absolute right-0 top-0 bottom-0 w-1/2 bg-background border-l border-border/50"
                        initial={{ x: 0 }}
                        exit={{ x: "100%", transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(245,158,11,0.03)_50%,transparent)]" />
                    </motion.div>

                    {/* Central Content (Wrapper) */}
                    <motion.div
                        className="relative z-10 flex flex-col items-center justify-center w-full max-w-md p-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{
                            opacity: 0,
                            scale: 2,
                            filter: "blur(10px)",
                            transition: { duration: 0.4 }
                        }}
                    >
                        {/* Holographic Lock Mechanism */}
                        <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
                            {/* Outer Ring */}
                            <motion.div
                                className="absolute inset-0 border-[1px] border-primary/20 dark:border-primary/30 rounded-full"
                                style={{ borderStyle: "dashed", borderWidth: "1px" }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            />
                            <motion.div
                                className="absolute inset-2 border-[1px] border-primary/10 dark:border-primary/10 rounded-full"
                                animate={{ rotate: -360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Scanning Radar */}
                            <motion.div
                                className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-primary/5 dark:via-primary/5 to-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Core Lock Icon */}
                            <div className="relative z-20 p-6 bg-background/80 backdrop-blur-sm rounded-none border border-primary/20 dark:border-primary/30 shadow-lg dark:shadow-[0_0_30px_-5px_rgba(0,0,0,0.3)]">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentState}
                                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {(() => {
                                            const Icon = loadingStates[currentState].icon
                                            return <Icon className="w-12 h-12 text-primary dark:text-primary" />
                                        })()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Orbiting Particles */}
                            <motion.div
                                className="absolute w-full h-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            >
                                <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary dark:bg-primary rounded-full shadow-md dark:shadow-[0_0_10px_rgba(0,0,0,0.8)] -translate-x-1/2 -translate-y-1/2" />
                            </motion.div>
                        </div>

                        {/* Status Text Console */}
                        <div className="flex flex-col items-center gap-2">
                            <motion.div
                                className="h-6 overflow-hidden flex items-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={currentState}
                                        className="font-mono text-sm md:text-base tracking-[0.2em] text-muted-foreground font-bold"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {loadingStates[currentState].text}
                                    </motion.span>
                                </AnimatePresence>
                            </motion.div>

                            {/* Progress Line */}
                            <div className="w-64 h-[2px] bg-muted/20 rounded-full mt-2 overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary dark:bg-primary"
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 2.2, ease: "easeInOut" }}
                                />
                            </div>

                            <div className="flex justify-between w-64 mt-1">
                                <span className="text-xs font-mono text-muted-foreground/60">SYS.894.2</span>
                                <span className="text-xs font-mono text-muted-foreground/60">SECURE</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
