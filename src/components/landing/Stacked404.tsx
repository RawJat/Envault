"use client"

import { motion } from "framer-motion"

export function Stacked404() {
    return (
        <div className="relative flex items-center justify-center select-none mt-40">
            <div className="relative font-bold font-serif tracking-tighter text-[10rem] md:text-[16rem] leading-none text-foreground">
                {/* Main Text (Bottom Anchor) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="relative z-10"
                >
                    404
                </motion.div>

                {/* Middle Slice (Echo 1) */}
                <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: "-0.4em" }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
                    className="absolute inset-0 text-foreground/40 pointer-events-none z-0"
                    style={{ clipPath: "polygon(0 0, 100% 0, 100% 45%, 0 45%)" }}
                    aria-hidden="true"
                >
                    404
                </motion.div>

                {/* Top Slice (Echo 2) */}
                <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: "-0.8em" }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                    className="absolute inset-0 text-foreground/20 pointer-events-none z-0"
                    style={{ clipPath: "polygon(0 0, 100% 0, 100% 45%, 0 45%)" }}
                    aria-hidden="true"
                >
                    404
                </motion.div>
            </div>
        </div>
    )
}
