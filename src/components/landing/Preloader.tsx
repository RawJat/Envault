"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Lock } from "lucide-react"

// Module-level variable to track if loader has shown in this session
let hasShown = false

const bootLogs = [
    { id: 1, text: "INITIALIZING KERNEL...", status: "OK" },
    { id: 2, text: "MOUNTING SECURE FILE SYSTEM", status: "MOUNTED" },
    { id: 3, text: "LOADING ENCRYPTION MODULES (AES-256)", status: "LOADED" },
    { id: 4, text: "ESTABLISHING SOCKET CONNECTION", status: "CONNECTED" },
    { id: 5, text: "SYNCING SECRET SHARDS", status: "SYNCED" },
    { id: 6, text: "VERIFYING INTEGRITY CHECKS", status: "VERIFIED" },
    { id: 7, text: "PREPARING INTERFACE RENDERER", status: "READY" },
]

export function Preloader() {
    const [isLoading, setIsLoading] = useState(!hasShown)
    const [currentLogIndex, setCurrentLogIndex] = useState(0)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (hasShown) return

        document.body.style.overflow = "hidden"

        // Progress bar timer
        const progressTimer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(progressTimer)
                    return 100
                }
                // Random increments for "realistic" loading
                return prev + Math.random() * 5
            })
        }, 100)

        // Log sequence timer
        const logTimer = setInterval(() => {
            setCurrentLogIndex((prev) => {
                if (prev >= bootLogs.length - 1) {
                    clearInterval(logTimer)
                    return prev
                }
                return prev + 1
            })
        }, 350)

        // Completion timer
        const completeTimer = setTimeout(() => {
            setIsLoading(false)
            hasShown = true
            document.body.style.overflow = "unset"
        }, 3200)

        return () => {
            document.body.style.overflow = "unset"
            clearInterval(progressTimer)
            clearInterval(logTimer)
            clearTimeout(completeTimer)
        }
    }, [])

    return (
        <AnimatePresence mode="wait">
            {isLoading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center font-mono cursor-wait">
                    
                    {/* Background layers */}
                    <div className="absolute inset-0 bg-background z-0" />
                    
                    {/* Blueprint Grid Overlay */}
                    {/* <div 
                        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                            backgroundSize: '40px 40px'
                        }}
                    /> */}

                    {/* Content Container */}
                    <div className="relative z-10 w-full max-w-2xl p-8 flex flex-col gap-8">
                        
                        {/* Header */}
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex justify-between items-end border-b border-primary/20 pb-4"
                        >
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase">Secure Bootloader</span>
                                <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
                                    <ShieldCheck className="w-6 h-6 text-primary" />
                                    ENVAULT<span className="text-primary">.SYS</span>
                                </h1>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground">VERSION 2.4.0</div>
                                <div className="text-xs text-primary animate-pulse">SYSTEM SECURE</div>
                            </div>
                        </motion.div>

                        {/* Main Grid: Loader + Logs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start min-h-[200px]">
                            
                            {/* Graphic Loader Left */}
                            <motion.div 
                                className="flex items-center justify-center h-full relative border border-primary/10 bg-primary/5 p-8 min-h-[200px]"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                {/* Spinning Abstract Ring */}
                                <motion.div
                                    className="absolute w-32 h-32 border-2 border-primary/20 rounded-full border-t-primary"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />
                                <motion.div
                                    className="absolute w-24 h-24 border border-dashed border-primary/40 rounded-full"
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                />
                                
                                {/* Center Icon */}
                                <div className="relative z-10 bg-background border border-primary/20 p-3">
                                    <Lock className="w-6 h-6 text-primary" />
                                </div>

                                {/* Decorative corners */}
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary" />
                                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary" />
                                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary" />
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary" />
                            </motion.div>

                            {/* Terminal Logs Right */}
                            <motion.div 
                                className="font-mono text-sm space-y-2 h-full flex flex-col justify-end"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                {bootLogs.slice(0, currentLogIndex + 1).map((log) => (
                                    <motion.div 
                                        key={log.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between text-xs sm:text-sm"
                                    >
                                        <span className="text-muted-foreground mr-2">{`> ${log.text}`}</span>
                                        <span className="text-primary font-bold">{log.status}</span>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>

                        {/* Progress Bar Bottom */}
                        <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
                                <span>Loading Assets</span>
                                <span>{Math.min(100, Math.floor(progress))}%</span>
                            </div>
                            <div className="h-1 w-full bg-primary/10 overflow-hidden">
                                <motion.div 
                                    className="h-full bg-primary"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground/50 font-mono pt-2">
                                <span>MEM: 0x8294A...</span>
                                <span>UID: GUEST_SESSION</span>
                            </div>
                        </motion.div>

                    </div>

                    {/* Split Curtain Reveal */}
                    <motion.div
                        className="fixed inset-y-0 left-0 w-1/2 bg-background border-r border-primary/20 z-[110]"
                        initial={{ x: "0%" }}
                        animate={{ x: isLoading ? "0%" : "-100%" }}
                        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
                    >
                         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
                    </motion.div>
                    
                    <motion.div
                        className="fixed inset-y-0 right-0 w-1/2 bg-background border-l border-primary/20 z-[110]"
                        initial={{ x: "0%" }}
                        animate={{ x: isLoading ? "0%" : "100%" }}
                        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
                    >
                         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
