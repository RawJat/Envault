"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShieldCheck, ArrowRight, Terminal } from "lucide-react"

export function Hero() {
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
                        className="text-6xl sm:text-7xl md:text-8xl font-serif font-bold tracking-tight leading-[0.95] text-foreground"
                    >
                        Envault.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                        className="text-base md:text-lg font-mono text-muted-foreground max-w-lg leading-relaxed border-l-2 border-primary/20 pl-4"
                    >
                        HIGH-TRUST VAULT FOR PRODUCTION SECRETS.<br/>
                        ZERO-KNOWLEDGE ARCHITECTURE.<br/>
                        ENTERPRISE-GRADE SECURITY.
                    </motion.p>

                    {/* Terminal Layer */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                        className="w-full max-w-lg border border-primary/20 bg-background/50 backdrop-blur-sm rounded-none overflow-hidden"
                    >
                        <div className="bg-primary text-primary-foreground px-4 py-2 font-mono text-xs flex items-center justify-between">
                            <span>[TERMINAL]</span>
                            <Terminal className="w-4 h-4" />
                        </div>
                        <div className="p-4 font-mono text-sm space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground/60">$</span>
                                <span className="text-foreground">envault push</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground/60">$</span>
                                <span className="text-foreground">envault pull</span>
                            </div>
                            <div className="text-muted-foreground/60 text-xs mt-2">
                                {`>> ENCRYPTED | SYNCED | SECURED`}
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
                </div>
                {/* Right column reserved for 3D model */}
                <div className="hidden md:block"></div>
            </div>
        </section>
    )
}
