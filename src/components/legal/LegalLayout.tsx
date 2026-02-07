"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"
import { RegMark } from "@/components/landing/RegMark"
import { ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

interface Section {
    id: string
    title: string
}

interface LegalLayoutProps {
    title: string
    lastUpdated: string
    sections: Section[]
    children: React.ReactNode
}

export function LegalLayout({ title, lastUpdated, sections, children }: LegalLayoutProps) {
    const [activeSection, setActiveSection] = useState<string>("")
    const [isScrolling, setIsScrolling] = useState(false)

    useEffect(() => {
        const observerOptions = {
            rootMargin: "-120px 0px -66% 0px",
            threshold: [0, 0.25, 0.5, 0.75, 1]
        }

        const visibleSections = new Map<string, number>()

        const observer = new IntersectionObserver(
            (entries) => {
                // Skip updates while programmatically scrolling
                if (isScrolling) return

                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        visibleSections.set(entry.target.id, entry.intersectionRatio)
                    } else {
                        visibleSections.delete(entry.target.id)
                    }
                })

                // Find the section with the highest intersection ratio
                if (visibleSections.size > 0) {
                    let maxRatio = 0
                    let topSection = ""
                    
                    visibleSections.forEach((ratio, id) => {
                        if (ratio > maxRatio) {
                            maxRatio = ratio
                            topSection = id
                        }
                    })

                    if (topSection) {
                        setActiveSection(topSection)
                    }
                }
            },
            observerOptions
        )

        sections.forEach(({ id }) => {
            const element = document.getElementById(id)
            if (element) observer.observe(element)
        })

        return () => {
            observer.disconnect()
            visibleSections.clear()
        }
    }, [sections, isScrolling])

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id)
        if (element) {
            setIsScrolling(true)
            setActiveSection(id) // Immediately set active for visual feedback
            
            // Calculate offset from top of viewport (navbar + breadcrumb + padding)
            const offset = 140
            const elementPosition = element.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - offset

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            })

            // Re-enable observer after scroll completes
            setTimeout(() => {
                setIsScrolling(false)
            }, 1000)
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            
            {/* Blueprint Grid Container */}
            <div className="relative flex-1 pt-24">
                {/* Grid Accents */}
                <RegMark position="top-left" />
                <RegMark position="top-right" />
                
                {/* Breadcrumbs */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="container max-w-7xl px-4 md:px-6 py-4 border-b border-border/50"
                >
                    <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                        <Link href="/" className="hover:text-foreground transition-colors">
                            Home
                        </Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-foreground">{title}</span>
                    </div>
                </motion.div>

                {/* Main Grid Layout */}
                <div className="container max-w-7xl px-4 md:px-6 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 relative">
                        {/* Vertical Grid Line */}
                        <div className="hidden lg:block absolute left-[calc(100%-280px-1.5rem)] top-0 bottom-0 w-px bg-border/30" />
                        
                        {/* Main Content Area */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="max-w-3xl"
                        >
                            {/* Title */}
                            <div className="mb-8 pb-8 border-b border-border/50">
                                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4">
                                    {title}
                                </h1>
                                <p className="text-sm font-mono text-muted-foreground">
                                    Last updated: {lastUpdated}
                                </p>
                            </div>

                            {/* Content */}
                            <div className="prose prose-stone dark:prose-invert max-w-none">
                                {children}
                            </div>
                        </motion.div>

                        {/* Sticky Sidebar Navigation */}
                        <motion.aside
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="hidden lg:block"
                        >
                            <div className="sticky top-28 space-y-4">
                                <div className="pb-4 border-b border-border/50">
                                    <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-muted-foreground">
                                        On this page
                                    </h2>
                                </div>
                                
                                <nav className="space-y-1">
                                    {sections.map((section, index) => {
                                        const isActive = activeSection === section.id
                                        return (
                                            <button
                                                key={section.id}
                                                onClick={() => scrollToSection(section.id)}
                                                className={`
                                                    w-full text-left text-sm transition-all duration-200
                                                    hover:text-foreground group relative py-2 px-3 rounded-md
                                                    ${isActive 
                                                        ? 'text-foreground bg-accent/50 font-medium' 
                                                        : 'text-muted-foreground hover:bg-accent/30'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xs opacity-60 shrink-0">
                                                        {String(index + 1).padStart(2, '0')}
                                                    </span>
                                                    <span className="flex-1 leading-relaxed">
                                                        {section.title}
                                                    </span>
                                                </div>
                                                
                                                {/* Active indicator */}
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeSection"
                                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary rounded-full"
                                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                    />
                                                )}
                                            </button>
                                        )
                                    })}
                                </nav>

                                {/* Grid Intersection Accent */}
                                <div className="pt-8 mt-8 border-t border-border/30">
                                    <div className="w-4 h-4 rounded-full border border-border/50 mx-auto opacity-30" />
                                </div>
                            </div>
                        </motion.aside>
                    </div>
                </div>

                {/* Bottom Accents */}
                <RegMark position="bottom-left" />
                <RegMark position="bottom-right" />
                
                {/* Horizontal Grid Lines */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />
                </div>
            </div>

            <Footer />
        </div>
    )
}
