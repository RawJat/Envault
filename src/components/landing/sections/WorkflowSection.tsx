import { Database, Shield, Users } from "lucide-react";
import { AnimatedStat } from "@/components/landing/ui/AnimatedStat";
import { AnimatedWorkflow } from "@/components/landing/animations/AnimatedWorkflow";
import { SlideUp } from "@/components/landing/animations/SlideUp";
import { FadeIn } from "@/components/landing/animations/FadeIn";

const workflowSteps = [
  {
    title: "Secure Variable Generation",
    description:
      "Generate type-safe, realistic environment variables for local development and testing without exposing sensitive production keys.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    icon: Database,
  },
  {
    title: "Collaborative Environments",
    description:
      "Share and sync environment configurations across your team, ensuring consistency from development to production.",
    color: "text-green-500",
    bg: "bg-green-500/10",
    icon: Users,
  },
  {
    title: "Automated Security & Compliance",
    description:
      "Enforce security policies, manage access controls, and maintain compliance with automated secret rotation and governance.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    icon: Shield,
  },
];

export function WorkflowSection() {
  return (
    <section className="py-16 md:py-24 bg-bone dark:bg-void relative overflow-hidden">
      <div className="container px-4 md:px-6">
        <SlideUp className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-foreground leading-[1.1]">
            Smarter secrets, all
            <br />
            in one place.
          </h2>
          <p className="max-w-[700px] mx-auto font-mono text-sm uppercase tracking-wider text-muted-foreground">
            Power your development workflow with high-quality, privacy-safe
            environment variables - generated,
            <br />
            validated, and secured from a single platform.
          </p>
        </SlideUp>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16">
          {/* Left Column: Image Placeholder */}
          <FadeIn className="relative border border-border min-h-[250px] sm:min-h-[300px] md:min-h-[350px] aspect-square sm:aspect-[5/4] lg:aspect-auto max-h-[500px] lg:max-h-none">
            <AnimatedWorkflow />
          </FadeIn>

          {/* Right Column: Workflow Steps */}
          <div className="space-y-4">
            {workflowSteps.map((step, index) => (
              <SlideUp
                key={index}
                delay={index * 0.15}
                className="group border border-border p-3 md:p-6 rounded-none bg-background hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start space-x-4 md:space-x-6">
                  <div
                    className={`p-3 md:p-4 rounded-none ${step.bg} ${step.color} flex-shrink-0 border border-black/5 dark:border-white/5`}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-mono text-sm uppercase tracking-wider font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                      {step.description}
                    </p>
                  </div>
                </div>
              </SlideUp>
            ))}
          </div>
        </div>

        {/* Bottom Stats Row */}
        <SlideUp delay={0.6} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Enterprise Teams", value: "10+" },
            { label: "Secrets Managed", value: "1K+" },
            { label: "Global Deployments", value: "5K+" },
            { label: "Uptime SLA", value: "99.9%" },
          ].map((stat, index) => (
            <div
              key={index}
              className="text-center p-8 border border-border rounded-none bg-background hover:bg-secondary/30 transition-colors"
            >
              <AnimatedStat value={stat.value} />
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </SlideUp>
      </div>
    </section>
  );
}
