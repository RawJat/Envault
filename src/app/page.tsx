import { Navbar } from "@/components/landing/Navbar"
import { Hero } from "@/components/landing/Hero"
import { Features } from "@/components/landing/Features"
import { WorkflowSection } from "@/components/landing/WorkflowSection"
import { Footer } from "@/components/landing/Footer"
import { Scene } from "@/components/landing/Scene"
import { RegMark } from "@/components/landing/RegMark"

import { CliSection } from "@/components/landing/CliSection"
import { Testimonials } from "@/components/landing/Testimonials"

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col font-sans selection:bg-primary/20 relative blueprint-grid sharp">
            {/* <Preloader /> */}
            <Scene />
            <Navbar />
            <main className="flex-1 relative">
                <RegMark position="top-left" />
                <RegMark position="top-right" />
                <Hero />
                <WorkflowSection />
                <CliSection />
                <div id="features" className="relative">
                    <Features />
                </div>
                <Testimonials />
                <RegMark position="bottom-left" />
                <RegMark position="bottom-right" />
            </main>
            <Footer />
        </div>
    )
}
