"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SlideUpProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  yOffset?: number;
  viewMargin?: string;
}

export function SlideUp({
  children,
  delay = 0,
  duration = 0.8,
  className = "",
  yOffset = 40,
  viewMargin = "-50px",
}: SlideUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      viewport={{ once: true, margin: viewMargin }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
