"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShieldCheck, ArrowRight, Terminal, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function Hero() {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = () => {
        navigator.clipboard.writeText("npx @dinanathdash/envault login")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
            <div className="container relative z-10 px-4 md:px-6 grid md:grid-cols-2 gap-12 items-center">
                <div className="flex flex-col items-start text-left space-y-8 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="flex items-center space-x-3 bg-primary/5 backdrop-blur-sm px-5 py-2 rounded-none border border-primary/10"
                    >
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        <span className="text-sm font-mono uppercase tracking-wider text-primary">MILITARY-GRADE ENCRYPTION</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold tracking-tight leading-[0.95] text-foreground"
                    >
                        Envault.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                        className="text-sm md:text-base lg:text-lg font-mono text-muted-foreground max-w-lg leading-relaxed border-l-2 border-primary/20 pl-4"
                    >
                        STOP MANUAL .ENV SHUFFLING.<br/>
                        SYNC SECRETS ACROSS YOUR TEAM IN &lt; 2 MINUTES.<br/>
                        ZERO-KNOWLEDGE ARCHITECTURE.
                    </motion.p>

                    {/* Terminal Layer */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                        className="w-full max-w-sm md:max-w-lg border border-primary/20 bg-background/50 backdrop-blur-sm rounded-none overflow-hidden"
                    >
                        <div className="bg-primary text-primary-foreground px-4 py-2 font-mono text-xs flex items-center justify-between">
                            <span>[TERMINAL]</span>
                            <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4" />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={copyToClipboard}
                                            className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Copy and run this command</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                        <div className="p-4 font-mono text-sm space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground/60">$</span>
                                <span className="text-foreground">npx @dinanathdash/envault login</span>
                            </div>
                            <div className="text-muted-foreground/60 text-xs mt-2">
                                {`>> AUTHENTICATE | SECURE | READY`}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                    >
                        <Link href="/login">
                            <Button size="lg" className="w-full sm:w-auto min-w-[180px] h-12 text-base font-mono uppercase tracking-wider rounded-none flex items-center gap-2">
                                ACCESS VAULT
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                        <Link href="https://github.com/dinanathdash/envault" target="_blank">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[180px] h-12 text-base font-mono uppercase tracking-wider rounded-none border-primary/20 hover:bg-primary/5 flex items-center gap-2">
                                DOCUMENTATION
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Social Proof & Metrics */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row items-center gap-6 mt-8"
                    >
                        <div className="text-center sm:text-left">
                            <p className="text-xs font-mono text-muted-foreground mb-1">TRUSTED BY DEVELOPERS</p>
                            <p className="text-sm font-medium">"Game-changer for our team's secret management!"</p>
                            <p className="text-xs text-muted-foreground">- Senior Dev at TechCorp</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
                        className="flex items-center gap-2 text-xs font-mono text-muted-foreground"
                    >
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span>Secured by AES-256-GCM & Supabase Auth</span>
                    </motion.div>
                </div>
                {/* Right column reserved for 3D model */}
                <div className="hidden md:block"></div>
            </div>
        </section>
    )
}
