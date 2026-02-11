"use client"

import {
    motion,
    useAnimationFrame,
    useMotionValue,
    useTransform
} from "framer-motion"
import { Star, Quote } from "lucide-react"
import { useRef } from "react"

const testimonials = [
    {
        name: "Sarah Chen",
        role: "Senior Backend Engineer",
        company: "TechFlow Inc.",
        content: "Envault completely changed our deployment workflow. We used to spend hours syncing environment variables across staging and production. Now it's a single command. The zero-knowledge encryption means we never have to worry about our secrets being compromised.",
        rating: 4,
    },
    {
        name: "Marcus Rodriguez",
        role: "DevOps Lead",
        company: "StartupXYZ",
        content: "As someone who's set up HashiCorp Vault before, I can tell you Envault is a breath of fresh air. No complex infrastructure, no learning curve. Our entire team was up and running in under 5 minutes. The CLI integration with our existing tools is flawless.",
        rating: 5,
    },
    {
        name: "Emily Watson",
        role: "Full Stack Developer",
        company: "InnovateLabs",
        content: "I was skeptical about yet another secret management tool, but Envault proved me wrong. The interface is intuitive, the security is top-notch with AES-256-GCM, and the fact that it's open source gives us complete transparency. Our microservices architecture finally has proper secret management.",
        rating: 4,
    },
    {
        name: "David Kim",
        role: "CTO",
        company: "ScaleUp Solutions",
        content: "Security was always our biggest concern with environment variables scattered across different environments. Envault's approach of keeping everything encrypted and synced automatically has given our security team peace of mind. Plus, the audit logs are comprehensive.",
        rating: 5,
    },
    {
        name: "Lisa Thompson",
        role: "Platform Engineer",
        company: "CloudFirst",
        content: "We've tried several secret management solutions, but Envault stands out for its developer experience. The CLI feels native to our workflow, and the web interface is perfect for non-technical team members. Migration was painless.",
        rating: 4,
    },
    {
        name: "Alex Johnson",
        role: "Software Engineer",
        company: "DevCorp",
        content: "The best part about Envault is how it integrates with our existing Git workflow. No more .env files in version control, no more manual updates. Our CI/CD pipeline is now truly secure and automated. Highly recommend for any serious development team.",
        rating: 5,
    },
]

export function Testimonials() {
    // 1. Setup Motion Values
    const baseX = useMotionValue(0)
    const isHovered = useRef(false)

    // 2. The loop logic
    // We move -0.05% per frame (adjust this number to change speed)
    useAnimationFrame((t, delta) => {
        if (!isHovered.current) {
            const moveBy = 0.04 * (delta / 24) // Normalized speed
            // If the value goes beyond -50% (the end of the first set), snap back to 0
            if (baseX.get() <= -50) {
                baseX.set(0)
            } else {
                baseX.set(baseX.get() - moveBy)
            }
        }
    })

    return (
        <section className="py-24 bg-muted/30 overflow-hidden">
            <div className="container px-4 md:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold mb-4">
                        Trusted by Developers Worldwide
                    </h2>
                    <p className="text-lg font-mono text-muted-foreground max-w-2xl mx-auto">
                        Join thousands of developers who have simplified their secret management with Envault
                    </p>
                </motion.div>

                {/* Static Grid for Mobile (unchanged) */}
                <div className="grid grid-cols-1 md:hidden gap-8">
                    {testimonials.slice(0, 3).map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: index * 0.2 }}
                            viewport={{ once: true }}
                            className="bg-background border border-border/50 rounded-none p-6 relative min-h-[280px] flex flex-col"
                        >
                            <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
                            <div className="flex-1">
                                <div className="flex mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                                    ))}
                                </div>
                                <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                                    {/* eslint-disable-next-line react/no-unescaped-entities */}
                                    &quot;{testimonial.content}&quot;
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(testimonial.name)}&backgroundColor=transparent`} alt={testimonial.name} className="w-10 h-10 rounded-none" />
                                <div>
                                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {testimonial.role} at {testimonial.company}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Scrolling Testimonials for Desktop */}
                {/* We use a mask-image to fade the edges for a smoother look */}
                <div
                    className="hidden md:flex relative overflow-hidden w-full [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
                    onMouseEnter={() => isHovered.current = true}
                    onMouseLeave={() => isHovered.current = false}
                >
                    <motion.div
                        className="flex gap-8"
                        style={{ x: useTransform(baseX, (v) => `${v}%`) }}
                    >
                        {/* We duplicate the data twice to ensure the loop is seamless */}
                        {[...testimonials, ...testimonials].map((testimonial, index) => (
                            <div
                                key={`${testimonial.name}-${index}`}
                                className="bg-background border border-border/50 rounded-none p-6 relative w-[420px] max-w-[420px] flex-shrink-0 min-h-[280px] flex flex-col group hover:border-primary/50 transition-colors duration-300"
                            >
                                <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
                                <div className="flex-1">
                                    <div className="flex mb-4">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                                        ))}
                                    </div>
                                    <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                                        "{testimonial.content}"
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(testimonial.name)}&backgroundColor=transparent`} alt={testimonial.name} className="w-10 h-10 rounded-none" />
                                    <div>
                                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {testimonial.role} at {testimonial.company}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}