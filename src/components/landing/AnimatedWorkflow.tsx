"use client";

import React, { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { 
  User, 
  GitBranch, 
  Shield, 
  Server, 
  Terminal, 
  Users,
  Eye,
  Lock,
  RefreshCw,
  CheckCircle2
} from "lucide-react";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex items-center justify-center border-2 bg-background p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] transition-all hover:scale-105",
        className,
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

export function AnimatedWorkflow() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Source nodes
  const developerRef = useRef<HTMLDivElement>(null);
  const cicdRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  
  // Envault central node
  const envaultRef = useRef<HTMLDivElement>(null);
  
  // Processing nodes
  const validateRef = useRef<HTMLDivElement>(null);
  const encryptRef = useRef<HTMLDivElement>(null);
  const rotateRef = useRef<HTMLDivElement>(null);
  
  // Destination nodes
  const localRef = useRef<HTMLDivElement>(null);
  const stagingRef = useRef<HTMLDivElement>(null);
  const prodRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden p-3 sm:p-4 md:p-6 lg:p-8"
      ref={containerRef}
    >      
      <div className="flex size-full flex-col items-stretch justify-between gap-[clamp(0.25rem,1.2vw,0.9rem)] relative max-w-5xl">
        {/* Row 1: Developer and Local */}
        <div className="flex flex-row items-start justify-between">
          <div className="flex flex-col items-center gap-1">
            <Circle ref={developerRef} className="size-[clamp(2.8rem,6.5vw,4rem)] border-blue-500/40 hover:border-blue-500/60">
              <User className="size-[clamp(1.25rem,2.8vw,1.6rem)] text-blue-500" />
            </Circle>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[clamp(0.5rem,1.4vw,0.7rem)] font-mono uppercase tracking-wider font-semibold text-foreground">Developer</span>
              <span className="text-[clamp(0.4rem,1.1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Push Secrets</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <Circle ref={localRef} className="size-[clamp(2.8rem,6.5vw,4rem)] border-yellow-500/40 hover:border-yellow-500/60">
              <Terminal className="size-[clamp(1.25rem,2.8vw,1.6rem)] text-yellow-500" />
            </Circle>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[clamp(0.5rem,1.4vw,0.7rem)] font-mono uppercase tracking-wider font-semibold text-foreground">Local</span>
              <span className="text-[clamp(0.4rem,1.1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Development</span>
            </div>
          </div>
        </div>
        
        {/* Row 2: CI/CD, Envault, Staging */}
        <div className="flex flex-row items-center justify-between relative">
          <div className="flex flex-col items-center gap-1">
            <Circle ref={cicdRef} className="size-[clamp(2.8rem,6.5vw,4rem)] border-purple-500/40 hover:border-purple-500/60">
              <GitBranch className="size-[clamp(1.25rem,2.8vw,1.6rem)] text-purple-500" />
            </Circle>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[clamp(0.5rem,1.4vw,0.7rem)] font-mono uppercase tracking-wider font-semibold text-foreground">CI/CD</span>
              <span className="text-[clamp(0.4rem,1.1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Pipeline</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <Circle ref={envaultRef} className="size-[clamp(3.6rem,10vw,6rem)] border-2 border-primary/50 bg-background shadow-2xl hover:shadow-primary/20 hover:border-primary/70">
              <Shield className="size-[clamp(1.9rem,4.8vw,3rem)] text-primary" />
            </Circle>
            <div className="flex flex-col items-center gap-0.5 mt-1">
              <span className="text-[clamp(0.55rem,1.6vw,0.95rem)] font-mono uppercase tracking-wider font-bold text-primary">ENVAULT</span>
              <span className="text-[clamp(0.4rem,1.1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Secure Hub</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <Circle ref={stagingRef} className="size-[clamp(2.8rem,6.5vw,4rem)] border-indigo-500/40 hover:border-indigo-500/60">
              <Eye className="size-[clamp(1.25rem,2.8vw,1.6rem)] text-indigo-500" />
            </Circle>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[clamp(0.5rem,1.4vw,0.7rem)] font-mono uppercase tracking-wider font-semibold text-foreground">Staging</span>
              <span className="text-[clamp(0.4rem,1.1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Testing</span>
            </div>
          </div>
        </div>
        
        {/* Row 3: Team and Production */}
        <div className="flex flex-row items-end justify-between">
          <div className="flex flex-col items-center gap-1">
            <Circle ref={teamRef} className="size-[clamp(2.8rem,6.5vw,4rem)] border-green-500/40 hover:border-green-500/60">
              <Users className="size-[clamp(1.25rem,2.8vw,1.6rem)] text-green-500" />
            </Circle>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[clamp(0.5rem,1.4vw,0.7rem)] font-mono uppercase tracking-wider font-semibold text-foreground">Team</span>
              <span className="text-[clamp(0.4rem,1.1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Collaborate</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <Circle ref={prodRef} className="size-[clamp(2.8rem,6.5vw,4rem)] border-emerald-500/40 hover:border-emerald-500/60">
              <Server className="size-[clamp(1.25rem,2.8vw,1.6rem)] text-emerald-500" />
            </Circle>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[clamp(0.5rem,1.4vw,0.7rem)] font-mono uppercase tracking-wider font-semibold text-foreground">Production</span>
              <span className="text-[clamp(0.4rem,1.1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Deploy</span>
            </div>
          </div>
        </div>
        
        {/* Processing Steps - Absolute Positioned Below Envault */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 translate-y-[clamp(3.6rem,10vw,6.5rem)] flex items-center gap-1 sm:gap-2 md:gap-3">
          <div className="flex flex-col items-center gap-0.5">
            <Circle ref={validateRef} className="size-[clamp(2.6rem,6.3vw,3.4rem)] border-orange-500/40 hover:border-orange-500/60">
              <CheckCircle2 className="size-[clamp(1.2rem,2.9vw,1.5rem)] text-orange-500" />
            </Circle>
            <span className="text-[clamp(0.4rem,1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Validate</span>
          </div>
          
          <div className="flex flex-col items-center gap-0.5">
            <Circle ref={encryptRef} className="size-[clamp(2.6rem,6.3vw,3.4rem)] border-red-500/40 hover:border-red-500/60">
              <Lock className="size-[clamp(1.2rem,2.9vw,1.5rem)] text-red-500" />
            </Circle>
            <span className="text-[clamp(0.4rem,1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Encrypt</span>
          </div>
          
          <div className="flex flex-col items-center gap-0.5">
            <Circle ref={rotateRef} className="size-[clamp(2.6rem,6.3vw,3.4rem)] border-cyan-500/40 hover:border-cyan-500/60">
              <RefreshCw className="size-[clamp(1.2rem,2.9vw,1.5rem)] text-cyan-500" />
            </Circle>
            <span className="text-[clamp(0.4rem,1vw,0.55rem)] font-mono uppercase tracking-wider text-muted-foreground">Rotate</span>
          </div>
        </div>
      </div>

      {/* Animated Beams - Sources to Envault */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={developerRef}
        toRef={envaultRef}
        curvature={50}
        gradientStartColor="#3b82f6"
        gradientStopColor="#8b5cf6"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={cicdRef}
        toRef={envaultRef}
        curvature={0}
        gradientStartColor="#a855f7"
        gradientStopColor="#ec4899"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={teamRef}
        toRef={envaultRef}
        curvature={-50}
        gradientStartColor="#10b981"
        gradientStopColor="#06b6d4"
      />

      {/* Animated Beams - Envault to Destinations */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={envaultRef}
        toRef={localRef}
        curvature={50}
        reverse
        gradientStartColor="#eab308"
        gradientStopColor="#f59e0b"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={envaultRef}
        toRef={stagingRef}
        curvature={0}
        reverse
        gradientStartColor="#6366f1"
        gradientStopColor="#8b5cf6"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={envaultRef}
        toRef={prodRef}
        curvature={-50}
        reverse
        gradientStartColor="#10b981"
        gradientStopColor="#059669"
      />
    </div>
  );
}
