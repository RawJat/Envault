"use client";

import { motion, useAnimationFrame, useMotionValue, useTransform } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useRef } from "react";
import Image from "next/image";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
}

export function AnimatedTestimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const baseX = useMotionValue(0);
  const isHovered = useRef(false);

  useAnimationFrame((t, delta) => {
    if (!isHovered.current) {
      const moveBy = 0.04 * (delta / 24);
      if (baseX.get() <= -50) {
        baseX.set(0);
      } else {
        baseX.set(baseX.get() - moveBy);
      }
    }
  });

  return (
    <div
      className="hidden md:flex relative overflow-hidden w-full [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
      onMouseEnter={() => (isHovered.current = true)}
      onMouseLeave={() => (isHovered.current = false)}
    >
      <motion.div
        className="flex gap-8"
        style={{ x: useTransform(baseX, (v) => `${v}%`) }}
      >
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
                &quot;{testimonial.content}&quot;
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Image
                src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(testimonial.name)}&backgroundColor=transparent`}
                alt={testimonial.name}
                width={40}
                height={40}
                unoptimized
                className="w-10 h-10 rounded-none"
              />
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
  );
}
